<?php
// phpcs:ignoreFile
// phpcs:disable Generic.Files.LineLength.TooLong
/* REMOVE THIS COMMENT AFTER PORTING */
/** @module */

namespace Parsoid;

use Parsoid\DOMDataUtils as DOMDataUtils;
use Parsoid\DOMUtils as DOMUtils;
use Parsoid\DiffUtils as DiffUtils;
use Parsoid\WTUtils as WTUtils;
use Parsoid\KV as KV;
use Parsoid\TagTk as TagTk;
use Parsoid\EndTagTk as EndTagTk;

/** @namespace */
class WTSUtils {
	public static function isValidSep( $sep ) {
		return preg_match( '/^(\s|<!--([^\-]|-(?!->))*-->)*$/', $sep );
	}

	public static function hasValidTagWidths( $dsr ) {
		return $dsr
&& gettype( $dsr[ 2 ] ) === 'number' && $dsr[ 2 ] >= 0
&& gettype( $dsr[ 3 ] ) === 'number' && $dsr[ 3 ] >= 0;
	}

	/**
	 * Get the attributes on a node in an array of KV objects.
	 *
	 * @param {Node} node
	 * @return KV[]
	 */
	public static function getAttributeKVArray( $node ) {
		$attribs = $node->attributes;
		$kvs = [];
		for ( $i = 0,  $l = count( $attribs );  $i < $l;  $i++ ) {
			$attrib = $attribs->item( $i );
			$kvs[] = new KV( $attrib->name, $attrib->value );
		}
		return $kvs;
	}

	/**
	 * Create a `TagTk` corresponding to a DOM node.
	 */
	public static function mkTagTk( $node ) {
		$attribKVs = $this->getAttributeKVArray( $node );
		return new TagTk( strtolower( $node->nodeName ), $attribKVs, DOMDataUtils::getDataParsoid( $node ) );
	}

	/**
	 * Create a `EndTagTk` corresponding to a DOM node.
	 */
	public static function mkEndTagTk( $node ) {
		$attribKVs = $this->getAttributeKVArray( $node );
		return new EndTagTk( strtolower( $node->nodeName ), $attribKVs, DOMDataUtils::getDataParsoid( $node ) );
	}

	/**
	 * For new elements, attrs are always considered modified.  However, For
	 * old elements, we only consider an attribute modified if we have shadow
	 * info for it and it doesn't match the current value.
	 * @return {Object}
	 * @return {any} return.value
	 * @return {boolean} return.modified If the value of the attribute changed since we parsed the wikitext.
	 * @return {boolean} return.fromsrc Whether we got the value from source-based roundtripping.
	 */
	public static function getShadowInfo( $node, $name, $curVal ) {
		$dp = DOMDataUtils::getDataParsoid( $node );

		// Not the case, continue regular round-trip information.
		if ( $dp->a === null || $dp->a[ $name ] === null ) {
			return [
				'value' => $curVal,
				// Mark as modified if a new element
				'modified' => WTUtils::isNewElt( $node ),
				'fromsrc' => false
			];
		} elseif ( $dp->a[ $name ] !== $curVal ) {
			return [
				'value' => $curVal,
				'modified' => true,
				'fromsrc' => false
			];
		} elseif ( $dp->sa === null || $dp->sa[ $name ] === null ) {
			return [
				'value' => $curVal,
				'modified' => false,
				'fromsrc' => false
			];
		} else {
			return [
				'value' => $dp->sa[ $name ],
				'modified' => false,
				'fromsrc' => true
			];
		}
	}

	/**
	 * Get shadowed information about an attribute on a node.
	 *
	 * @param {Node} node
	 * @param {string} name
	 * @return {Object}
	 * @return {any} return.value
	 * @return {boolean} return.modified If the value of the attribute changed since we parsed the wikitext.
	 * @return {boolean} return.fromsrc Whether we got the value from source-based roundtripping.
	 */
	public static function getAttributeShadowInfo( $node, $name ) {
		return $this->getShadowInfo( $node, $name, $node->getAttribute( $name ) );
	}

	public static function commentWT( $comment ) {
		return '<!--' . WTUtils::decodeComment( $comment ) . '-->';
	}

	/**
	 * Emit the start tag source when not round-trip testing, or when the node is
	 * not marked with autoInsertedStart.
	 */
	public static function emitStartTag( $src, $node, $state, $dontEmit ) {
		if ( !$state->rtTestMode || !DOMDataUtils::getDataParsoid( $node )->autoInsertedStart ) {
			if ( !$dontEmit ) {
				$state->emitChunk( $src, $node );
			}
			return true;
		} else {
			// drop content
			return false;
		}
	}

	/**
	 * Emit the start tag source when not round-trip testing, or when the node is
	 * not marked with autoInsertedStart.
	 */
	public static function emitEndTag( $src, $node, $state, $dontEmit ) {
		if ( !$state->rtTestMode || !DOMDataUtils::getDataParsoid( $node )->autoInsertedEnd ) {
			if ( !$dontEmit ) {
				$state->emitChunk( $src, $node );
			}
			return true;
		} else {
			// drop content
			return false;
		}
	}

	/**
	 * In wikitext, did origNode occur next to a block node which has been
	 * deleted? While looking for next, we look past DOM nodes that are
	 * transparent in rendering. (See emitsSolTransparentSingleLineWT for
	 * which nodes.)
	 */
	public static function nextToDeletedBlockNodeInWT( $origNode, $before ) {
		if ( !$origNode || DOMUtils::isBody( $origNode ) ) {
			return false;
		}

		while ( true ) { // eslint-disable-line
			// Find the nearest node that shows up in HTML (ignore nodes that show up
			// in wikitext but don't affect sol-state or HTML rendering -- note that
			// whitespace is being ignored, but that whitespace occurs between block nodes).
			$node = $origNode;
			do {
				$node = ( $before ) ? $node->previousSibling : $node->nextSibling;
				if ( DiffUtils::maybeDeletedNode( $node ) ) {
					return DiffUtils::isDeletedBlockNode( $node );
				}
			} while ( $node && WTUtils::emitsSolTransparentSingleLineWT( $node ) );

			if ( $node ) {
				return false;
			} else {
				// Walk up past zero-width wikitext parents
				$node = $origNode->parentNode;
				if ( !WTUtils::isZeroWidthWikitextElt( $node ) ) {
					// If the parent occupies space in wikitext,
					// clearly, we are not next to a deleted block node!
					// We'll eventually hit BODY here and return.
					return false;
				}
				$origNode = $node;
			}
		}
	}

	/**
	 * Check if whitespace preceding this node would NOT trigger an indent-pre.
	 */
	public static function precedingSpaceSuppressesIndentPre( $node, $sepNode ) {
		if ( $node !== $sepNode && DOMUtils::isText( $node ) ) {
			// if node is the same as sepNode, then the separator text
			// at the beginning of it has been stripped out already, and
			// we cannot use it to test it for indent-pre safety
			return preg_match( '/^[ \t]*\n/', $node->nodeValue );
		} elseif ( $node->nodeName === 'BR' ) {
			return true;
		} elseif ( WTUtils::isFirstEncapsulationWrapperNode( $node ) ) {
			// Dont try any harder than this
			return ( !$node->hasChildNodes() ) || preg_match( '/^\n/', $node->innerHTML );
		} else {
			return WTUtils::isBlockNodeWithVisibleWT( $node );
		}
	}

	public static function traceNodeName( $node ) {
		switch ( $node->nodeType ) {
			case $node::ELEMENT_NODE:
			return ( DOMUtils::isDiffMarker( $node ) ) ?
			'DIFF_MARK' : 'NODE: ' . $node->nodeName;
			case $node::TEXT_NODE:
			return 'TEXT: ' . json_encode( $node->nodeValue );
			case $node::COMMENT_NODE:
			return 'CMT : ' . json_encode( self::commentWT( $node->nodeValue ) );
			default:
			return $node->nodeName;
		}
	}

	/**
	 * In selser mode, check if an unedited node's wikitext from source wikitext
	 * is reusable as is.
	 * @param {MWParserEnvironment} env
	 * @param {Node} node
	 * @return bool
	 */
	public static function origSrcValidInEditedContext( $env, $node ) {
		$prev = null;

		if ( WTUtils::isRedirectLink( $node ) ) {
			return DOMUtils::isBody( $node->parentNode ) && !$node->previousSibling;
		} elseif ( $node->nodeName === 'TH' || $node->nodeName === 'TD' ) {
			// The wikitext representation for them is dependent
			// on cell position (first cell is always single char).

			// If there is no previous sibling, nothing to worry about.
			$prev = $node->previousSibling;
			if ( !$prev ) {
				return true;
			}

			// If previous sibling is unmodified, nothing to worry about.
			if ( !DOMUtils::isDiffMarker( $prev )
&& !DiffUtils::hasInsertedDiffMark( $prev, $env )
&& !DiffUtils::directChildrenChanged( $prev, $env )
			) {
				return true;
			}

			// If it didn't have a stx marker that indicated that the cell
			// showed up on the same line via the "||" or "!!" syntax, nothing
			// to worry about.
			return DOMDataUtils::getDataParsoid( $node )->stx !== 'row';
		} elseif ( $node->nodeName === 'TR' && !DOMDataUtils::getDataParsoid( $node )->startTagSrc ) {
			// If this <tr> didn't have a startTagSrc, it would have been
			// the first row of a table in original wikitext. So, it is safe
			// to reuse the original source for the row (without a "|-") as long as
			// it continues to be the first row of the table.  If not, since we need to
			// insert a "|-" to separate it from the newly added row (in an edit),
			// we cannot simply reuse orig. wikitext for this <tr>.
			return !DOMUtils::previousNonSepSibling( $node );
		} elseif ( DOMUtils::isNestedListOrListItem( $node ) ) {
			// If there are no previous siblings, bullets were assigned to
			// containing elements in the ext.core.ListHandler. For example,
			//
			// *** a
			//
			// Will assign bullets as,
			//
			// <ul><li-*>
			// <ul><li-*>
			// <ul><li-*> a</li></ul>
			// </li></ul>
			// </li></ul>
			//
			// If we reuse the src for the inner li with the a, we'd be missing
			// two bullets because the tag handler for lists in the serializer only
			// emits start tag src when it hits a first child that isn't a list
			// element. We need to walk up and get them.
			$prev = $node->previousSibling;
			if ( !$prev ) {
				return false;
			}

			// If a previous sibling was modified, we can't reuse the start dsr.
			while ( $prev ) {
				if ( DOMUtils::isDiffMarker( $prev )
|| DiffUtils::hasInsertedDiffMark( $prev, $env )
				) {
					return false;
				}
				$prev = $prev->previousSibling;
			}

			return true;
		} else {
			return true;
		}
	}

	/**
	 * Extracts the media type from attribute string
	 *
	 * @param {Node} node
	 * @return Object
	 */
	public static function getMediaType( $node ) {
		$typeOf = $node->getAttribute( 'typeof' ) || '';
		$match = preg_match( '/(?:^|\s)(mw:(?:Image|Video|Audio))(?:\/(\w*))?(?:\s|$)/', $typeOf );
		return [
			'rdfaType' => $match && $match[ 1 ] || '',
			'format' => $match && $match[ 2 ] || ''
		];
	}

	/**
	 * @param {Object} dataMw
	 * @param {string} key
	 * @param {boolean} keep
	 * @return Array|null
	 */
	public static function getAttrFromDataMw( $dataMw, $key, $keep ) {
		$arr = $dataMw->attribs || [];
		$i = $arr->findIndex( function ( $a ) use ( &$key ) {return ( $a[ 0 ] === $key || $a[ 0 ]->txt === $key );
  } );
		if ( $i < 0 ) { return null;
  }
		$ret = $arr[ $i ];
		if ( !$keep && $ret[ 1 ]->html === null ) {
			array_splice( $arr, $i, 1 );
		}
		return $ret;
	}
}

if ( gettype( $module ) === 'object' ) {
	$module->exports->WTSUtils = $WTSUtils;
}