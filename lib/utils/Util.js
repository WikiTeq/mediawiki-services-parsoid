/**
 * This file contains general utilities for token transforms.
 *
 * @module
 */

'use strict';

require('../../core-upgrade.js');

var crypto = require('crypto');
var entities = require('entities');
var Consts = require('../config/WikitextConstants.js').WikitextConstants;

/**
 * @namespace
 */
var Util = {

	// Non-global and global versions of regexp for use everywhere
	COMMENT_REGEXP: /<!--(?:[^-]|-(?!->))*-->/,
	COMMENT_REGEXP_G: /<!--(?:[^-]|-(?!->))*-->/g,

	/**
	 * Update only those properties that are undefined or null in the target.
	 *
	 * @param {Object} tgt The object to modify.
	 * @param {...Object} subject The object to extend tgt with. Add more arguments to the function call to chain more extensions.
	 * @return {Object} The modified object.
	 */
	extendProps: function(tgt, subject /* FIXME: use spread operator */) {
		function internalExtend(target, obj) {
			var allKeys = [].concat(Object.keys(target), Object.keys(obj));
			for (var i = 0, numKeys = allKeys.length; i < numKeys; i++) {
				var k = allKeys[i];
				if (target[k] === undefined || target[k] === null) {
					target[k] = obj[k];
				}
			}
			return target;
		}
		var n = arguments.length;
		for (var j = 1; j < n; j++) {
			internalExtend(tgt, arguments[j]);
		}
		return tgt;
	},

	stripParsoidIdPrefix: function(aboutId) {
		// 'mwt' is the prefix used for new ids in mediawiki.parser.environment#newObjectId
		return aboutId.replace(/^#?mwt/, '');
	},

	isParsoidObjectId: function(aboutId) {
		// 'mwt' is the prefix used for new ids in mediawiki.parser.environment#newObjectId
		return aboutId.match(/^#mwt/);
	},

	/**
	 * Determine if the named tag is void (can not have content).
	 *
	 * @param name
	 */
	isVoidElement: function(name) {
		return Consts.HTML.VoidTags.has(name.toUpperCase());
	},

	// deep clones by default.
	clone: function(obj, deepClone) {
		if (deepClone === undefined) {
			deepClone = true;
		}
		if (Array.isArray(obj)) {
			if (deepClone) {
				return obj.map(function(el) {
					return Util.clone(el, true);
				});
			} else {
				return obj.slice();
			}
		} else if (obj instanceof Object && // only "plain objects"
					Object.getPrototypeOf(obj) === Object.prototype) {
			/* This definition of "plain object" comes from jquery,
			 * via zepto.js.  But this is really a big hack; we should
			 * probably put a console.assert() here and more precisely
			 * delimit what we think is legit to clone. (Hint: not
			 * DOM trees.) */
			if (deepClone) {
				return Object.keys(obj).reduce(function(nobj, key) {
					nobj[key] = Util.clone(obj[key], true);
					return nobj;
				}, {});
			} else {
				return Object.assign({}, obj);
			}
		} else {
			return obj;
		}
	},

	// Just a copy `Util.clone` used in *testing* to reverse the effects of
	// freezing an object.  Works with more that just "plain objects"
	unFreeze: function(obj, deepClone) {
		if (deepClone === undefined) {
			deepClone = true;
		}
		if (Array.isArray(obj)) {
			if (deepClone) {
				return obj.map(function(el) {
					return Util.unFreeze(el, true);
				});
			} else {
				return obj.slice();
			}
		} else if (obj instanceof Object) {
			if (deepClone) {
				return Object.keys(obj).reduce(function(nobj, key) {
					nobj[key] = Util.unFreeze(obj[key], true);
					return nobj;
				}, new obj.constructor());
			} else {
				return Object.assign({}, obj);
			}
		} else {
			return obj;
		}
	},

	/**
	 * Extract the last *unicode* character of the string.
	 * This might be more than one javascript character, if the
	 * last character is a martian.
	 *
	 * @param str
	 * @param idx
	 */
	lastUniChar: function(str, idx) {
		if (idx === undefined) { idx = str.length; }
		if (idx <= 0 || idx > str.length) { return ''; }
		let s = str[--idx];
		if (/[\uDC00-\uDFFF]/.test(s)) {
			s = str[--idx] + s;
		}
		return s;
	},

	// Arguably we shouldn't be using this; see:
	// https://phabricator.wikimedia.org/T238022#5665580
	isUniWord: function(c) {
		try {
			// Have to hide this regexp from eslint (!)
			return (new RegExp("^[\\p{L}\\p{N}_]", "u")).test(c);
		} catch (e) { /* oh, well, we have to do this the hard way */ }
		// Courtesy of https://mothereff.in/regexpu for the above
		return /^[0-9A-Z_a-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09F4-\u09F9\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71-\u0B77\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BF2\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C66-\u0C6F\u0C78-\u0C7E\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D58-\u0D61\u0D66-\u0D78\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F33\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BA\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA830-\uA835\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\u{10000}-\u{1000B}\u{1000D}-\u{10026}\u{10028}-\u{1003A}\u{1003C}\u{1003D}\u{1003F}-\u{1004D}\u{10050}-\u{1005D}\u{10080}-\u{100FA}\u{10107}-\u{10133}\u{10140}-\u{10178}\u{1018A}\u{1018B}\u{10280}-\u{1029C}\u{102A0}-\u{102D0}\u{102E1}-\u{102FB}\u{10300}-\u{10323}\u{1032D}-\u{1034A}\u{10350}-\u{10375}\u{10380}-\u{1039D}\u{103A0}-\u{103C3}\u{103C8}-\u{103CF}\u{103D1}-\u{103D5}\u{10400}-\u{1049D}\u{104A0}-\u{104A9}\u{104B0}-\u{104D3}\u{104D8}-\u{104FB}\u{10500}-\u{10527}\u{10530}-\u{10563}\u{10600}-\u{10736}\u{10740}-\u{10755}\u{10760}-\u{10767}\u{10800}-\u{10805}\u{10808}\u{1080A}-\u{10835}\u{10837}\u{10838}\u{1083C}\u{1083F}-\u{10855}\u{10858}-\u{10876}\u{10879}-\u{1089E}\u{108A7}-\u{108AF}\u{108E0}-\u{108F2}\u{108F4}\u{108F5}\u{108FB}-\u{1091B}\u{10920}-\u{10939}\u{10980}-\u{109B7}\u{109BC}-\u{109CF}\u{109D2}-\u{10A00}\u{10A10}-\u{10A13}\u{10A15}-\u{10A17}\u{10A19}-\u{10A35}\u{10A40}-\u{10A48}\u{10A60}-\u{10A7E}\u{10A80}-\u{10A9F}\u{10AC0}-\u{10AC7}\u{10AC9}-\u{10AE4}\u{10AEB}-\u{10AEF}\u{10B00}-\u{10B35}\u{10B40}-\u{10B55}\u{10B58}-\u{10B72}\u{10B78}-\u{10B91}\u{10BA9}-\u{10BAF}\u{10C00}-\u{10C48}\u{10C80}-\u{10CB2}\u{10CC0}-\u{10CF2}\u{10CFA}-\u{10D23}\u{10D30}-\u{10D39}\u{10E60}-\u{10E7E}\u{10F00}-\u{10F27}\u{10F30}-\u{10F45}\u{10F51}-\u{10F54}\u{10FE0}-\u{10FF6}\u{11003}-\u{11037}\u{11052}-\u{1106F}\u{11083}-\u{110AF}\u{110D0}-\u{110E8}\u{110F0}-\u{110F9}\u{11103}-\u{11126}\u{11136}-\u{1113F}\u{11144}\u{11150}-\u{11172}\u{11176}\u{11183}-\u{111B2}\u{111C1}-\u{111C4}\u{111D0}-\u{111DA}\u{111DC}\u{111E1}-\u{111F4}\u{11200}-\u{11211}\u{11213}-\u{1122B}\u{11280}-\u{11286}\u{11288}\u{1128A}-\u{1128D}\u{1128F}-\u{1129D}\u{1129F}-\u{112A8}\u{112B0}-\u{112DE}\u{112F0}-\u{112F9}\u{11305}-\u{1130C}\u{1130F}\u{11310}\u{11313}-\u{11328}\u{1132A}-\u{11330}\u{11332}\u{11333}\u{11335}-\u{11339}\u{1133D}\u{11350}\u{1135D}-\u{11361}\u{11400}-\u{11434}\u{11447}-\u{1144A}\u{11450}-\u{11459}\u{1145F}\u{11480}-\u{114AF}\u{114C4}\u{114C5}\u{114C7}\u{114D0}-\u{114D9}\u{11580}-\u{115AE}\u{115D8}-\u{115DB}\u{11600}-\u{1162F}\u{11644}\u{11650}-\u{11659}\u{11680}-\u{116AA}\u{116B8}\u{116C0}-\u{116C9}\u{11700}-\u{1171A}\u{11730}-\u{1173B}\u{11800}-\u{1182B}\u{118A0}-\u{118F2}\u{118FF}\u{119A0}-\u{119A7}\u{119AA}-\u{119D0}\u{119E1}\u{119E3}\u{11A00}\u{11A0B}-\u{11A32}\u{11A3A}\u{11A50}\u{11A5C}-\u{11A89}\u{11A9D}\u{11AC0}-\u{11AF8}\u{11C00}-\u{11C08}\u{11C0A}-\u{11C2E}\u{11C40}\u{11C50}-\u{11C6C}\u{11C72}-\u{11C8F}\u{11D00}-\u{11D06}\u{11D08}\u{11D09}\u{11D0B}-\u{11D30}\u{11D46}\u{11D50}-\u{11D59}\u{11D60}-\u{11D65}\u{11D67}\u{11D68}\u{11D6A}-\u{11D89}\u{11D98}\u{11DA0}-\u{11DA9}\u{11EE0}-\u{11EF2}\u{11FC0}-\u{11FD4}\u{12000}-\u{12399}\u{12400}-\u{1246E}\u{12480}-\u{12543}\u{13000}-\u{1342E}\u{14400}-\u{14646}\u{16800}-\u{16A38}\u{16A40}-\u{16A5E}\u{16A60}-\u{16A69}\u{16AD0}-\u{16AED}\u{16B00}-\u{16B2F}\u{16B40}-\u{16B43}\u{16B50}-\u{16B59}\u{16B5B}-\u{16B61}\u{16B63}-\u{16B77}\u{16B7D}-\u{16B8F}\u{16E40}-\u{16E96}\u{16F00}-\u{16F4A}\u{16F50}\u{16F93}-\u{16F9F}\u{16FE0}\u{16FE1}\u{16FE3}\u{17000}-\u{187F7}\u{18800}-\u{18AF2}\u{1B000}-\u{1B11E}\u{1B150}-\u{1B152}\u{1B164}-\u{1B167}\u{1B170}-\u{1B2FB}\u{1BC00}-\u{1BC6A}\u{1BC70}-\u{1BC7C}\u{1BC80}-\u{1BC88}\u{1BC90}-\u{1BC99}\u{1D2E0}-\u{1D2F3}\u{1D360}-\u{1D378}\u{1D400}-\u{1D454}\u{1D456}-\u{1D49C}\u{1D49E}\u{1D49F}\u{1D4A2}\u{1D4A5}\u{1D4A6}\u{1D4A9}-\u{1D4AC}\u{1D4AE}-\u{1D4B9}\u{1D4BB}\u{1D4BD}-\u{1D4C3}\u{1D4C5}-\u{1D505}\u{1D507}-\u{1D50A}\u{1D50D}-\u{1D514}\u{1D516}-\u{1D51C}\u{1D51E}-\u{1D539}\u{1D53B}-\u{1D53E}\u{1D540}-\u{1D544}\u{1D546}\u{1D54A}-\u{1D550}\u{1D552}-\u{1D6A5}\u{1D6A8}-\u{1D6C0}\u{1D6C2}-\u{1D6DA}\u{1D6DC}-\u{1D6FA}\u{1D6FC}-\u{1D714}\u{1D716}-\u{1D734}\u{1D736}-\u{1D74E}\u{1D750}-\u{1D76E}\u{1D770}-\u{1D788}\u{1D78A}-\u{1D7A8}\u{1D7AA}-\u{1D7C2}\u{1D7C4}-\u{1D7CB}\u{1D7CE}-\u{1D7FF}\u{1E100}-\u{1E12C}\u{1E137}-\u{1E13D}\u{1E140}-\u{1E149}\u{1E14E}\u{1E2C0}-\u{1E2EB}\u{1E2F0}-\u{1E2F9}\u{1E800}-\u{1E8C4}\u{1E8C7}-\u{1E8CF}\u{1E900}-\u{1E943}\u{1E94B}\u{1E950}-\u{1E959}\u{1EC71}-\u{1ECAB}\u{1ECAD}-\u{1ECAF}\u{1ECB1}-\u{1ECB4}\u{1ED01}-\u{1ED2D}\u{1ED2F}-\u{1ED3D}\u{1EE00}-\u{1EE03}\u{1EE05}-\u{1EE1F}\u{1EE21}\u{1EE22}\u{1EE24}\u{1EE27}\u{1EE29}-\u{1EE32}\u{1EE34}-\u{1EE37}\u{1EE39}\u{1EE3B}\u{1EE42}\u{1EE47}\u{1EE49}\u{1EE4B}\u{1EE4D}-\u{1EE4F}\u{1EE51}\u{1EE52}\u{1EE54}\u{1EE57}\u{1EE59}\u{1EE5B}\u{1EE5D}\u{1EE5F}\u{1EE61}\u{1EE62}\u{1EE64}\u{1EE67}-\u{1EE6A}\u{1EE6C}-\u{1EE72}\u{1EE74}-\u{1EE77}\u{1EE79}-\u{1EE7C}\u{1EE7E}\u{1EE80}-\u{1EE89}\u{1EE8B}-\u{1EE9B}\u{1EEA1}-\u{1EEA3}\u{1EEA5}-\u{1EEA9}\u{1EEAB}-\u{1EEBB}\u{1F100}-\u{1F10C}\u{20000}-\u{2A6D6}\u{2A700}-\u{2B734}\u{2B740}-\u{2B81D}\u{2B820}-\u{2CEA1}\u{2CEB0}-\u{2EBE0}\u{2F800}-\u{2FA1D}]/u.test(c);
	},

	/**
	 * Emulate PHP's trim, which is almost-but-not-quite like JS's trim.
	 *
	 * PHP: https://www.php.net/manual/en/function.trim.php
	 *
	 * JS: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
	 *
	 * @param str
	 */
	phpTrim: function(str) {
		return str.replace(/(?:^[ \t\n\r\0\x0B]+)|(?:[ \t\n\r\0\x0B]+$)/g, '');
	},

	/**
	 * Emulate PHP's urlencode by patching results of
	 * JS's `encodeURIComponent`.
	 *
	 * PHP: https://secure.php.net/manual/en/function.urlencode.php
	 *
	 * JS:  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
	 *
	 * Spaces to '+' is a PHP peculiarity as well.
	 *
	 * @param txt
	 */
	phpURLEncode: function(txt) {
		return encodeURIComponent(txt)
			.replace(/!/g, '%21')
			.replace(/'/g, '%27')
			.replace(/\(/g, '%28')
			.replace(/\)/g, '%29')
			.replace(/\*/g, '%2A')
			.replace(/~/g, '%7E')
			.replace(/%20/g, '+');
	},

	/*
	 * Wraps `decodeURI` in a try/catch to suppress throws from malformed URI
	 * sequences.  Distinct from `decodeURIComponent` in that certain
	 * sequences aren't decoded if they result in (un)reserved characters.
	 */
	decodeURI: function(s) {
		// Most of the time we should have valid input
		try {
			return decodeURI(s);
		} catch (e) {
			// Fall through
		}

		// Extract each encoded character and decode it individually
		return s.replace(
			/%[0-7][0-9A-F]|%[CD][0-9A-F]%[89AB][0-9A-F]|%E[0-9A-F](?:%[89AB][0-9A-F]){2}|%F[0-4](?:%[89AB][0-9A-F]){3}/gi,
			function(m) {
				try {
					return decodeURI(m);
				} catch (e) {
					return m;
				}
			}
		);
	},

	/*
	 * Wraps `decodeURIComponent` in a try/catch to suppress throws from
	 * malformed URI sequences.
	 */
	decodeURIComponent: function(s) {
		// Most of the time we should have valid input
		try {
			return decodeURIComponent(s);
		} catch (e) {
			// Fall through
		}

		// Extract each encoded character and decode it individually
		return s.replace(
			/%[0-7][0-9A-F]|%[CD][0-9A-F]%[89AB][0-9A-F]|%E[0-9A-F](?:%[89AB][0-9A-F]){2}|%F[0-4](?:%[89AB][0-9A-F]){3}/gi,
			function(m) {
				try {
					return decodeURIComponent(m);
				} catch (e) {
					return m;
				}
			}
		);
	},

	extractExtBody: function(token) {
		var extSrc = token.getAttribute('source');
		var extTagOffsets = token.dataAttribs.extTagOffsets;
		return extSrc.slice(extTagOffsets[2], -extTagOffsets[3]);
	},

	isValidDSR: function(dsr, all) {
		const isValidOffset = n => typeof (n) === 'number' && n >= 0;
		return dsr &&
			isValidOffset(dsr[0]) && isValidOffset(dsr[1]) &&
			(!all || (isValidOffset(dsr[2]) && isValidOffset(dsr[3])));
	},

	/**
	 * Quickly hash an array or string.
	 *
	 * @param {Array|string} arr
	 */
	makeHash: function(arr) {
		var md5 = crypto.createHash('MD5');
		var i;
		if (Array.isArray(arr)) {
			for (i = 0; i < arr.length; i++) {
				if (arr[i] instanceof String) {
					md5.update(arr[i]);
				} else {
					md5.update(arr[i].toString());
				}
				md5.update("\0");
			}
		} else {
			md5.update(arr);
		}
		return md5.digest('hex');
	},

	/**
	 * Cannonicalizes a namespace name.
	 *
	 * Used by {@link WikiConfig}.
	 *
	 * @param {string} name Non-normalized namespace name.
	 * @return {string}
	 */
	normalizeNamespaceName: function(name) {
		return name.toLowerCase().replace(' ', '_');
	},

	/**
	 * Compare two titles for equality.
	 *
	 * @param {Title} t1
	 * @param {Title} t2
	 * @return {boolean}
	 */
	titleEquals: function(t1, t2) {
		// See: https://github.com/wikimedia/mediawiki-title/pull/43
		return (t1 === t2) || (
			t1 !== null && t2 !== null && t1.getKey() === t2.getKey() &&
			Util.namespaceEquals(t1.getNamespace(), t2.getNamespace())
		);
	},

	/**
	 * Compare two namespaces for equality.
	 *
	 * @param {Namespace} n1
	 * @param {Namespace} n2
	 * @return {boolean}
	 */
	namespaceEquals: function(n1, n2) {
		// We shouldn't have to access the private _id field of namespace :(
		// See: https://github.com/wikimedia/mediawiki-title/pull/43
		return (n1 === n2) || (n1 !== null && n2 !== null && n1._id === n2._id);
	},

	/**
	 * Decode HTML5 entities in wikitext.
	 *
	 * NOTE that wikitext only allows semicolon-terminated entities, while
	 * HTML allows a number of "legacy" entities to be decoded without
	 * a terminating semicolon.  This function deliberately does not
	 * decode these HTML-only entity forms.
	 *
	 * @param {string} text
	 * @return {string}
	 */
	decodeWtEntities: function(text) {
		// HTML5 allows semicolon-less entities which wikitext does not:
		// in wikitext all entities must end in a semicolon.
		return text.replace(
			/&[#0-9a-zA-Z]+;/g,
			(match) => {
				// Be careful: `&ampamp;` can get through the above, which
				// decodeHTML5 will decode to `&amp;` -- but that's a sneaky
				// semicolon-less entity!
				const m = /^&#(?:x([A-Fa-f0-9]+)|(\d+));$/.exec(match);
				let c, cp;
				if (m) {
					// entities contains a bunch of weird legacy mappings
					// for numeric codepoints (T113194) which we don't want.
					if (m[1]) {
						cp = Number.parseInt(m[1], 16);
					} else {
						cp = Number.parseInt(m[2], 10);
					}
					if (cp > 0x10FFFF) {
						// Invalid entity, don't give to String.fromCodePoint
						return match;
					}
					c = String.fromCodePoint(cp);
				} else {
					c = entities.decodeHTML5(match);
					// Length can be legit greater than one if it is astral
					if (c.length > 1 && c.endsWith(';')) {
						// Invalid entity!
						return match;
					}
					cp = c.codePointAt(0);
				}
				// Check other banned codepoints (T106578)
				if (
					(cp < 0x09) ||
					(cp > 0x0A && cp < 0x20) ||
					(cp > 0x7E && cp < 0xA0) ||
					(cp > 0xD7FF && cp < 0xE000) ||
					(cp > 0xFFFD && cp < 0x10000) ||
					(cp > 0x10FFFF)
				) {
					// Invalid entity!
					return match;
				}
				return c;
			}
		);
	},

	/**
	 * Entity-escape anything that would decode to a valid wikitext entity.
	 *
	 * Note that HTML5 allows certain "semicolon-less" entities, like
	 * `&para`; these aren't allowed in wikitext and won't be escaped
	 * by this function.
	 *
	 * @param {string} text
	 * @return {string}
	 */
	escapeWtEntities: function(text) {
		// [CSA] replace with entities.encode( text, 2 )?
		// but that would encode *all* ampersands, where we apparently just want
		// to encode ampersands that precede valid entities.
		return text.replace(/&[#0-9a-zA-Z]+;/g, function(match) {
			var decodedChar = Util.decodeWtEntities(match);
			if (decodedChar !== match) {
				// Escape the ampersand
				return '&amp;' + match.substr(1);
			} else {
				// Not an entity, just return the string
				return match;
			}
		});
	},

	escapeHtml: function(s) {
		return s.replace(/["'&<>]/g, entities.encodeHTML5);
	},

	/**
	 * Encode all characters as entity references.  This is done to make
	 * characters safe for wikitext (regardless of whether they are
	 * HTML-safe).
	 *
	 * @param {string} s
	 * @return {string}
	 */
	entityEncodeAll: function(s) {
		// this is surrogate-aware
		return Array.from(s).map(function(c) {
			c = c.codePointAt(0).toString(16).toUpperCase();
			if (c.length === 1) { c = '0' + c; } // convention
			if (c === 'A0') { return '&nbsp;'; } // special-case common usage
			return '&#x' + c + ';';
		}).join('');
	},

	/**
	 * Determine whether the protocol of a link is potentially valid. Use the
	 * environment's per-wiki config to do so.
	 *
	 * @param linkTarget
	 * @param env
	 */
	isProtocolValid: function(linkTarget, env) {
		var wikiConf = env.conf.wiki;
		if (typeof linkTarget === 'string') {
			return wikiConf.hasValidProtocol(linkTarget);
		} else {
			return true;
		}
	},

	parseMediaDimensions: function(str, onlyOne) {
		var dimensions = null;
		var match = str.match(/^(\d*)(?:x(\d+))?\s*(?:px\s*)?$/);
		if (match) {
			dimensions = { x: undefined, y: undefined };
			if (match[1].length) {
				dimensions.x = Number(match[1]);
			}
			if (match[2] !== undefined) {
				if (onlyOne) { return null; }
				dimensions.y = Number(match[2]);
			}
		}
		return dimensions;
	},

	// More generally, this is defined by the media handler in core
	validateMediaParam: function(num) {
		return num !== null && num !== undefined && num > 0;
	},

	// Extract content in a backwards compatible way
	getStar: function(revision) {
		var content = revision;
		if (revision && revision.slots) {
			content = revision.slots.main;
		}
		return content;
	},

	/**
	 * Magic words masquerading as templates.
	 *
	 * @property {Set}
	 */
	magicMasqs: new Set(["defaultsort", "displaytitle"]),

	/**
	 * This regex was generated by running through *all unicode characters* and
	 * testing them against *all regexes* for linktrails in a default MW install.
	 * We had to treat it a little bit, here's what we changed:
	 *
	 * 1. A-Z, though allowed in Walloon, is disallowed.
	 * 2. '"', though allowed in Chuvash, is disallowed.
	 * 3. '-', though allowed in Icelandic (possibly due to a bug), is disallowed.
	 * 4. '1', though allowed in Lak (possibly due to a bug), is disallowed.
	 *
	 * @property {RegExp}
	 */
	linkTrailRegex: new RegExp(
		'^[^\0-`{÷ĀĈ-ČĎĐĒĔĖĚĜĝĠ-ĪĬ-įĲĴ-ĹĻ-ĽĿŀŅņŉŊŌŎŏŒŔŖ-ŘŜŝŠŤŦŨŪ-ŬŮŲ-ŴŶŸ' +
		'ſ-ǤǦǨǪ-Ǯǰ-ȗȜ-ȞȠ-ɘɚ-ʑʓ-ʸʽ-̂̄-΅·΋΍΢Ϗ-ЯѐѝѠѢѤѦѨѪѬѮѰѲѴѶѸѺ-ѾҀ-҃҅-ҐҒҔҕҘҚҜ-ҠҤ-ҪҬҭҰҲ' +
		'Ҵ-ҶҸҹҼ-ҿӁ-ӗӚ-ӜӞӠ-ӢӤӦӪ-ӲӴӶ-ՠֈ-׏׫-ؠً-ٳٵ-ٽٿ-څڇ-ڗڙ-ڨڪ-ڬڮڰ-ڽڿ-ۅۈ-ۊۍ-۔ۖ-਀਄਋-਎਑਒' +
		'਩਱਴਷਺਻਽੃-੆੉੊੎-੘੝੟-੯ੴ-჏ჱ-ẼẾ-\u200b\u200d-‒—-‗‚‛”--\ufffd]+$'),

	/**
	 * Check whether some text is a valid link trail.
	 *
	 * @param {string} text
	 * @return {boolean}
	 */
	isLinkTrail: function(text) {
		if (text && text.match && text.match(this.linkTrailRegex)) {
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Convert mediawiki-format language code to a BCP47-compliant language
	 * code suitable for including in HTML.  See
	 * `GlobalFunctions.php::wfBCP47()` in mediawiki sources.
	 *
	 * @param {string} code Mediawiki language code.
	 * @return {string} BCP47 language code.
	 */
	bcp47: function(code) {
		var codeSegment = code.split('-');
		var codeBCP = [];
		codeSegment.forEach(function(seg, segNo) {
			// When previous segment is x, it is a private segment and should be lc
			if (segNo > 0 && /^x$/i.test(codeSegment[segNo - 1])) {
				codeBCP[segNo] = seg.toLowerCase();
			// ISO 3166 country code
			} else if (seg.length === 2 && segNo > 0) {
				codeBCP[segNo] = seg.toUpperCase();
			// ISO 15924 script code
			} else if (seg.length === 4 && segNo > 0) {
				codeBCP[segNo] = seg[0].toUpperCase() + seg.slice(1).toLowerCase();
			// Use lowercase for other cases
			} else {
				codeBCP[segNo] = seg.toLowerCase();
			}
		});
		return codeBCP.join('-');
	},
};

if (typeof module === "object") {
	module.exports.Util = Util;
}
