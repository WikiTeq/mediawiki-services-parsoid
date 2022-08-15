/** @module */

"use strict";

const { DOMDataUtils } = require('../utils/DOMDataUtils.js');
const { DOMUtils } = require('../utils/DOMUtils.js');
const { DiffUtils } = require('./DiffUtils.js');
const { WTUtils } = require('../utils/WTUtils.js');

/** @namespace */
class WTSUtils {
	static isValidSep(sep) {
		return sep.match(/^(\s|<!--([^\-]|-(?!->))*-->)*$/);
	}

	static hasValidTagWidths(dsr) {
		return dsr &&
			typeof (dsr[2]) === 'number' && dsr[2] >= 0 &&
			typeof (dsr[3]) === 'number' && dsr[3] >= 0;
	}

	/**
	 * For new elements, attrs are always considered modified.  However, For
	 * old elements, we only consider an attribute modified if we have shadow
	 * info for it and it doesn't match the current value.
	 *
	 * @param node
	 * @param name
	 * @param curVal
	 * @return {Object}
	 *   @return {any} return.value
	 *   @return {boolean} return.modified If the value of the attribute changed since we parsed the wikitext.
	 *   @return {boolean} return.fromsrc Whether we got the value from source-based roundtripping.
	 */
	static getShadowInfo(node, name, curVal) {
		var dp = DOMDataUtils.getDataParsoid(node);

		// Not the case, continue regular round-trip information.
		if (dp.a === undefined || dp.a[name] === undefined) {
			return {
				value: curVal,
				// Mark as modified if a new element
				modified: WTUtils.isNewElt(node),
				fromsrc: false,
			};
		} else if (dp.a[name] !== curVal) {
			return {
				value: curVal,
				modified: true,
				fromsrc: false,
			};
		} else if (dp.sa === undefined || dp.sa[name] === undefined) {
			return {
				value: curVal,
				modified: false,
				fromsrc: false,
			};
		} else {
			return {
				value: dp.sa[name],
				modified: false,
				fromsrc: true,
			};
		}
	}

	/**
	 * Get shadowed information about an attribute on a node.
	 *
	 * @param {Node} node
	 * @param {string} name
	 * @return {Object}
	 *   @return {any} return.value
	 *   @return {boolean} return.modified If the value of the attribute changed since we parsed the wikitext.
	 *   @return {boolean} return.fromsrc Whether we got the value from source-based roundtripping.
	 */
	static getAttributeShadowInfo(node, name) {
		return this.getShadowInfo(node, name, node.hasAttribute(name) ? node.getAttribute(name) : null);
	}

	static commentWT(comment) {
		return '<!--' + WTUtils.decodeComment(comment) + '-->';
	}

	/**
	 * In wikitext, did origNode occur next to a block node which has been
	 * deleted? While looking for next, we look past DOM nodes that are
	 * transparent in rendering. (See emitsSolTransparentSingleLineWT for
	 * which nodes.)
	 *
	 * @param origNode
	 * @param before
	 */
	static nextToDeletedBlockNodeInWT(origNode, before) {
		if (!origNode || DOMUtils.isBody(origNode)) {
			return false;
		}

		while (true) {
			// Find the nearest node that shows up in HTML (ignore nodes that show up
			// in wikitext but don't affect sol-state or HTML rendering -- note that
			// whitespace is being ignored, but that whitespace occurs between block nodes).
			var node = origNode;
			do {
				node = before ? node.previousSibling : node.nextSibling;
				if (DiffUtils.maybeDeletedNode(node)) {
					return DiffUtils.isDeletedBlockNode(node);
				}
			} while (node && WTUtils.emitsSolTransparentSingleLineWT(node));

			if (node) {
				return false;
			} else {
				// Walk up past zero-width wikitext parents
				node = origNode.parentNode;
				if (!WTUtils.isZeroWidthWikitextElt(node)) {
					// If the parent occupies space in wikitext,
					// clearly, we are not next to a deleted block node!
					// We'll eventually hit BODY here and return.
					return false;
				}
				origNode = node;
			}
		}
	}

	/**
	 * Check if whitespace preceding this node would NOT trigger an indent-pre.
	 *
	 * @param node
	 * @param sepNode
	 */
	static precedingSpaceSuppressesIndentPre(node, sepNode) {
		if (node !== sepNode && DOMUtils.isText(node)) {
			// if node is the same as sepNode, then the separator text
			// at the beginning of it has been stripped out already, and
			// we cannot use it to test it for indent-pre safety
			return node.nodeValue.match(/^[ \t]*\n/);
		} else if (node.nodeName === 'BR') {
			return true;
		} else if (WTUtils.isFirstEncapsulationWrapperNode(node)) {
			// Dont try any harder than this
			return (!node.hasChildNodes()) || node.innerHTML.match(/^\n/);
		} else {
			return WTUtils.isBlockNodeWithVisibleWT(node);
		}
	}

	static traceNodeName(node) {
		switch (node.nodeType) {
			case node.ELEMENT_NODE:
				return DOMUtils.isDiffMarker(node) ?
					"DIFF_MARK" : "NODE: " + node.nodeName;
			case node.TEXT_NODE:
				return "TEXT: " + JSON.stringify(node.nodeValue);
			case node.COMMENT_NODE:
				return "CMT : " + JSON.stringify(WTSUtils.commentWT(node.nodeValue));
			default:
				return node.nodeName;
		}
	}

	/**
	 * In selser mode, check if an unedited node's wikitext from source wikitext
	 * is reusable as is.
	 *
	 * @param {MWParserEnvironment} env
	 * @param {Node} node
	 * @return {boolean}
	 */
	static origSrcValidInEditedContext(env, node) {
		var prev;

		if (WTUtils.isRedirectLink(node)) {
			return DOMUtils.isBody(node.parentNode) && !node.previousSibling;
		} else if (node.nodeName === 'TH' || node.nodeName === 'TD') {
			// The wikitext representation for them is dependent
			// on cell position (first cell is always single char).

			// If there is no previous sibling, nothing to worry about.
			prev = node.previousSibling;
			if (!prev) {
				return true;
			}

			// If previous sibling is unmodified, nothing to worry about.
			if (!DOMUtils.isDiffMarker(prev) &&
				!DiffUtils.hasInsertedDiffMark(prev, env) &&
				!DiffUtils.directChildrenChanged(prev, env)) {
				return true;
			}

			// If it didn't have a stx marker that indicated that the cell
			// showed up on the same line via the "||" or "!!" syntax, nothing
			// to worry about.
			return DOMDataUtils.getDataParsoid(node).stx !== 'row';
		} else if (node.nodeName === 'TR' && !DOMDataUtils.getDataParsoid(node).startTagSrc) {
			// If this <tr> didn't have a startTagSrc, it would have been
			// the first row of a table in original wikitext. So, it is safe
			// to reuse the original source for the row (without a "|-") as long as
			// it continues to be the first row of the table.  If not, since we need to
			// insert a "|-" to separate it from the newly added row (in an edit),
			// we cannot simply reuse orig. wikitext for this <tr>.
			return !DOMUtils.previousNonSepSibling(node);
		} else if (DOMUtils.isNestedListOrListItem(node)) {
			// If there are no previous siblings, bullets were assigned to
			// containing elements in the ext.core.ListHandler. For example,
			//
			//   *** a
			//
			// Will assign bullets as,
			//
			//   <ul><li-*>
			//     <ul><li-*>
			//       <ul><li-*> a</li></ul>
			//     </li></ul>
			//   </li></ul>
			//
			// If we reuse the src for the inner li with the a, we'd be missing
			// two bullets because the tag handler for lists in the serializer only
			// emits start tag src when it hits a first child that isn't a list
			// element. We need to walk up and get them.
			prev = node.previousSibling;
			if (!prev) {
				return false;
			}

			// If a previous sibling was modified, we can't reuse the start dsr.
			while (prev) {
				if (DOMUtils.isDiffMarker(prev) ||
					DiffUtils.hasInsertedDiffMark(prev, env)
				) {
					return false;
				}
				prev = prev.previousSibling;
			}

			return true;
		} else {
			return true;
		}
	}

	/**
	 * @param {Object} dataMw
	 * @param {string} key
	 * @param {boolean} keep
	 * @return {Array|null}
	 */
	static getAttrFromDataMw(dataMw, key, keep) {
		const arr = dataMw.attribs || [];
		const i = arr.findIndex(a => (a[0] === key || a[0].txt === key));
		if (i < 0) { return null; }
		const ret = arr[i];
		if (!keep && ret[1].html === undefined) {
			arr.splice(i, 1);
		}
		return ret;
	}
}

if (typeof module === "object") {
	module.exports.WTSUtils = WTSUtils;
}
