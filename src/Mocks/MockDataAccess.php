<?php

namespace Wikimedia\Parsoid\Mocks;

use Error;
use Wikimedia\Parsoid\Config\DataAccess;
use Wikimedia\Parsoid\Config\PageConfig;
use Wikimedia\Parsoid\Config\PageContent;
use Wikimedia\Parsoid\Utils\PHPUtils;

/**
 * This implements some of the functionality that the tests/ParserTests/MockAPIHelper.php
 * provides. While originally implemented to support ParserTests, this is no longer used
 * by parser tests.
 */
class MockDataAccess implements DataAccess {
	private static $PAGE_DATA = [
		"Main_Page" => [
			"title" => "Main Page",
			"pageid" => 1,
			"ns" => 0,
			"revid" => 1,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					// phpcs:ignore Generic.Files.LineLength.TooLong
					'*' => "<strong>MediaWiki has been successfully installed.</strong>\n\nConsult the [//meta.wikimedia.org/wiki/Help:Contents User's Guide] for information on using the wiki software.\n\n== Getting started ==\n* [//www.mediawiki.org/wiki/Special:MyLanguage/Manual:Configuration_settings Configuration settings list]\n* [//www.mediawiki.org/wiki/Special:MyLanguage/Manual:FAQ MediaWiki FAQ]\n* [https://lists.wikimedia.org/mailman/listinfo/mediawiki-announce MediaWiki release mailing list]\n* [//www.mediawiki.org/wiki/Special:MyLanguage/Localisation#Translation_resources Localise MediaWiki for your language]"
				]
			]
		],
		"Junk_Page" => [
			"title" => "Junk Page",
			"pageid" => 2,
			"ns" => 0,
			"revid" => 2,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => '2. This is just some junk. See the comment above.'
				]
			]
		],
		"Large_Page" => [
			"title" => "Large_Page",
			"pageid" => 3,
			"ns" => 0,
			"revid" => 3,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => '', // Will be fixed up in the constructor
				]
			]
		],
		"Reuse_Page" => [
			"title" => "Reuse_Page",
			"pageid" => 100,
			"ns" => 0,
			"revid" => 100,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => '{{colours of the rainbow}}'
				]
			]
		],
		"JSON_page" => [
			"title" => "JSON_Page",
			"pageid" => 101,
			"ns" => 0,
			"revid" => 101,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'json',
					'contentformat' => 'text/json',
					'*' => '[1]'
				]
			]
		],
		"Lint_Page" => [
			"title" => "Lint Page",
			"pageid" => 102,
			"ns" => 0,
			"revid" => 102,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => "{|\nhi\n|ho\n|}"
				]
			]
		],
		"Redlinks_Page" => [
			"title" => "Redlinks Page",
			"pageid" => 103,
			"ns" => 0,
			"revid" => 103,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => '[[Special:Version]] [[Doesnotexist]] [[Redirected]]'
				]
			]
		],
		"Variant_Page" => [
			"title" => "Variant Page",
			"pageid" => 104,
			"ns" => 0,
			"revid" => 104,
			"parentid" => 0,
			'pagelanguage' => 'sr',
			'pagelanguagedir' => 'ltr',
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => "абвг abcd"
				]
			]
		],
		"No_Variant_Page" => [
			"title" => "No Variant Page",
			"pageid" => 105,
			"ns" => 0,
			"revid" => 105,
			"parentid" => 0,
			'pagelanguage' => 'sr',
			'pagelanguagedir' => 'ltr',
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => "абвг abcd\n__NOCONTENTCONVERT__"
				]
			]
		],
		"Revision_ID" => [
			"title" => "Revision ID",
			"pageid" => 63,
			"ns" => 0,
			"revid" => 63,
			"parentid" => 0,
			'pagelanguage' => 'sr',
			'pagelanguagedir' => 'ltr',
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => '{{REVISIONID}}'
				]
			]
		],
		"Redirected" => [
			"title" => "Revision ID",
			"pageid" => 63,
			"ns" => 0,
			"revid" => 64,
			"parentid" => 0,
			"redirect" => true,
		],
		"Disambiguation" => [
			"title" => "Disambiguation Page",
			"pageid" => 106,
			"ns" => 0,
			"revid" => 106,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => "This is a mock disambiguation page with no more info!"
				]
			],
			"linkclasses" => [
				"mw-disambig",
			]
		],
		"Special:Version" => [
			"title" => "Version",
			"pageid" => 107,
			"ns" => -1,
			"revid" => 107,
			"parentid" => 0,
			'slots' => [
				'main' => [
					'contentmodel' => 'wikitext',
					'contentformat' => 'text/x-wiki',
					'*' => "This is a mock special page."
				]
			],
		]
	];

	// This templatedata description only provides a subset of fields
	// that mediawiki API returns. Parsoid only uses the format and
	// paramOrder fields at this point, so keeping these lean.
	private const TEMPLATE_DATA = [
		'Template:NoFormatWithParamOrder' => [
			'paramOrder' => [ 'f0', 'f1', 'unused2', 'f2', 'unused3' ]
		],
		'Template:InlineTplNoParamOrder' => [
			'format' => 'inline'
		],
		'Template:BlockTplNoParamOrder' => [
			'format' => 'block'
		],
		'Template:InlineTplWithParamOrder' => [
			'format' => 'inline',
			'paramOrder' => [ 'f1', 'f2' ]
		],
		'Template:BlockTplWithParamOrder' => [
			'format' => 'block',
			'paramOrder' => [ 'f1', 'f2' ]
		],
		'Template:WithParamOrderAndAliases' => [
			'params' => [
				'f1' => [ 'aliases' => [ 'f4', 'f3' ] ]
			],
			'paramOrder' => [ 'f1', 'f2' ]
		],
		'Template:InlineFormattedTpl_1' => [
			'format' => '{{_|_=_}}'
		],
		'Template:InlineFormattedTpl_2' => [
			'format' => "\n{{_ | _ = _}}"
		],
		'Template:InlineFormattedTpl_3' => [
			'format' => '{{_| _____ = _}}'
		],
		'Template:BlockFormattedTpl_1' => [
			'format' => "{{_\n| _ = _\n}}"
		],
		'Template:BlockFormattedTpl_2' => [
			'format' => "\n{{_\n| _ = _\n}}\n"
		],
		'Template:BlockFormattedTpl_3' => [
			'format' => "{{_|\n _____ = _}}"
		]
	];

	private const FNAMES = [
		'Image:Foobar.jpg' => 'Foobar.jpg',
		'File:Foobar.jpg' => 'Foobar.jpg',
		'Archivo:Foobar.jpg' => 'Foobar.jpg',
		'Mynd:Foobar.jpg' => 'Foobar.jpg',
		"Датотека:Foobar.jpg" => 'Foobar.jpg',
		'Image:Foobar.svg' => 'Foobar.svg',
		'File:Foobar.svg' => 'Foobar.svg',
		'Image:Thumb.png' => 'Thumb.png',
		'File:Thumb.png' => 'Thumb.png',
		'File:LoremIpsum.djvu' => 'LoremIpsum.djvu',
		'File:Video.ogv' => 'Video.ogv',
		'File:Audio.oga' => 'Audio.oga'
	];

	private const PNAMES = [
		'Image:Foobar.jpg' => 'File:Foobar.jpg',
		'Image:Foobar.svg' => 'File:Foobar.svg',
		'Image:Thumb.png' => 'File:Thumb.png'
	];

	// configuration to match PHP parserTests
	// Note that parserTests use a MockLocalRepo with
	// url=>'http://example.com/images' although $wgServer="http://example.org"
	private const IMAGE_BASE_URL = 'http://example.com/images';
	private const IMAGE_DESC_URL = self::IMAGE_BASE_URL;
	private const FILE_PROPS = [
		'Foobar.jpg' => [
			'size' => 7881,
			'width' => 1941,
			'height' => 220,
			'bits' => 8,
			'mime' => 'image/jpeg'
		],
		'Thumb.png' => [
			'size' => 22589,
			'width' => 135,
			'height' => 135,
			'bits' => 8,
			'mime' => 'image/png'
		],
		'Foobar.svg' => [
			'size' => 12345,
			'width' => 240,
			'height' => 180,
			'bits' => 24,
			'mime' => 'image/svg+xml'
		],
		'LoremIpsum.djvu' => [
			'size' => 3249,
			'width' => 2480,
			'height' => 3508,
			'bits' => 8,
			'mime' => 'image/vnd.djvu'
		],
		'Video.ogv' => [
			'size' => 12345,
			'width' => 320,
			'height' => 240,
			'bits' => 0,
			# duration comes from
			# TimedMediaHandler/tests/phpunit/mocks/MockOggHandler::getLength()
			'duration' => 4.3666666666667,
			'mime' => 'video/ogg; codecs="theora"',
			'mediatype' => 'VIDEO',
			'thumbtimes' => [
				'1.2' => 'seek%3D1.2',
				'85' => 'seek%3D3.3666666666667', # hard limited by duration
			],
		],
		'Audio.oga' => [
			'size' => 12345,
			'width' => 0,
			'height' => 0,
			'bits' => 0,
			# duration comes from
			# TimedMediaHandler/tests/phpunit/mocks/MockOggHandler::getLength()
			'duration' => 0.99875,
			'mime' => 'audio/ogg; codecs="vorbis"',
			'mediatype' => 'AUDIO',
			'title' => 'Original Ogg file (41 kbps)',
			'shorttitle' => 'Ogg source',
		]
	];

	/**
	 * @param string $title
	 * @return string
	 */
	private function normTitle( string $title ): string {
		return strtr( $title, ' ', '_' );
	}

	/**
	 * @param array $opts
	 */
	public function __construct( array $opts ) {
		// Update data of the large page
		$mainSlot = &self::$PAGE_DATA['Large_Page']['slots']['main'];
		$mainSlot['*'] = str_repeat( 'a', $opts['maxWikitextSize'] ?? 1000000 );
	}

	/** @inheritDoc */
	public function getPageInfo( PageConfig $pageConfig, array $titles ): array {
		$ret = [];
		foreach ( $titles as $title ) {
			$normTitle = $this->normTitle( $title );
			$pageData = self::$PAGE_DATA[$normTitle] ?? null;
			$ret[$title] = [
				'pageId' => $pageData['pageid'] ?? null,
				'revId' => $pageData['revid'] ?? null,
				'missing' => $pageData === null,
				'known' => $pageData !== null || ( $pageData['known'] ?? false ),
				'redirect' => $pageData['redirect'] ?? false,
				'linkclasses' => $pageData['linkclasses'] ?? [],
			];
		}

		return $ret;
	}

	/** @inheritDoc */
	public function getFileInfo( PageConfig $pageConfig, array $files ): array {
		$ret = [];
		foreach ( $files as $name => $dims ) {
			// From mockAPI.js
			$normFileName = self::FNAMES[$name] ?? $name;
			$props = self::FILE_PROPS[$normFileName] ?? null;
			if ( $props === null ) {
				// We don't have info for this file
				continue;
			}

			$md5 = md5( $normFileName );
			$md5prefix = $md5[0] . '/' . $md5[0] . $md5[1] . '/';
			$baseurl = self::IMAGE_BASE_URL . '/' . $md5prefix . $normFileName;
			$height = $props['height'] ?? 220;
			$width = $props['width'] ?? 1941;
			$turl = self::IMAGE_BASE_URL . '/thumb/' . $md5prefix . $normFileName;
			$durl = self::IMAGE_DESC_URL . '/' . $normFileName;
			$mediatype = $props['mediatype'] ??
				$props['mime'] === 'image/svg+xml' ? 'DRAWING' : 'BITMAP';

			$info = [
				'size' => $props['size'] ?? 12345,
				'height' => $height,
				'width' => $width,
				'url' => $baseurl,
				'descriptionurl' => $durl,
				'mediatype' => $mediatype,
				'mime' => $props['mime']
			];

			if ( isset( $props['duration'] ) ) {
				$info['duration'] = $props['duration'];
			}

			// See Config/Api/DataAccess.php
			$txopts = [
				'width' => null,
				'height' => null,
			];
			if ( isset( $dims['width'] ) && $dims['width'] !== null ) {
				$txopts['width'] = $dims['width'];
				if ( isset( $dims['page'] ) ) {
					$txopts['page'] = $dims['page'];
				}
			}
			if ( isset( $dims['height'] ) && $dims['height'] !== null ) {
				$txopts['height'] = $dims['height'];
			}
			if ( isset( $dims['seek'] ) ) {
				$txopts['thumbtime'] = $dims['seek'];
			}

			// From mockAPI.js
			if ( $mediatype === 'VIDEO' && empty( $txopts['height'] ) && empty( $txopts['width'] ) ) {
				$txopts['width'] = $width;
				$txopts['height'] = $height;
			}

			if ( !empty( $txopts['height'] ) || !empty( $txopts['width'] ) ) {
				if ( $txopts['height'] === null ) {
					// File::scaleHeight in PHP
					$txopts['height'] = round( $height * $txopts['width'] / $width );
				} elseif ( $txopts['width'] === null ) {
					// MediaHandler::fitBoxWidth in PHP
					// This is crazy!
					$idealWidth = $width * $txopts['height'] / $height;
					$roundedUp = ceil( $idealWidth );
					if ( round( $roundedUp * $height / $width ) > $txopts['height'] ) {
						$txopts['width'] = floor( $idealWidth );
					} else {
						$txopts['width'] = $roundedUp;
					}
				} else {
					if ( round( $height * $txopts['width'] / $width ) > $txopts['height'] ) {
						$txopts['width'] = ceil( $width * $txopts['height'] / $height );
					} else {
						$txopts['height'] = round( $height * $txopts['width'] / $width );
					}
				}

				$urlWidth = $txopts['width'];
				if ( $txopts['width'] > $width ) {
					// The PHP api won't enlarge a bitmap ... but the batch api will.
					// But, to match the PHP sections, don't scale.
					if ( $mediatype !== 'DRAWING' ) {
						$urlWidth = $width;
					}
				}
				if ( $urlWidth !== $width || $mediatype === 'AUDIO' || $mediatype === 'VIDEO' ) {
					$turl .= '/' . $urlWidth . 'px-';
					if ( $mediatype === 'VIDEO' ) {
						// Hack in a 'seek' option, if provided (T258767)
						if ( isset( $txopts['thumbtime'] ) ) {
							$turl .= $props['thumbtimes'][strval( $txopts['thumbtime'] )] ?? '';
						}
						$turl .= '-';
					}
					$turl .= $normFileName;
					switch ( $mediatype ) {
						case 'AUDIO':
							// No thumbs are generated for audio
							$turl = self::IMAGE_BASE_URL . '/w/resources/assets/file-type-icons/fileicon-ogg.png';
							break;
						case 'VIDEO':
							$turl .= '.jpg';
							break;
						case 'DRAWING':
							$turl .= '.png';
							break;
					}
				} else {
					$turl = $baseurl;
				}
				$info['thumbwidth'] = $txopts['width'];
				$info['thumbheight'] = $txopts['height'];
				$info['thumburl'] = $turl;
			}
			// Make this look like a TMH response
			if ( isset( $props['title'] ) || isset( $props['shorttitle'] ) ) {
				$info['derivatives'] = [
					[
						'src' => $info['url'],
						'type' => $info['mime'],
						'width' => strval( $info['width'] ),
						'height' => strval( $info['height'] ),
					]
				];
				if ( isset( $props['title'] ) ) {
					$info['derivatives'][0]['title'] = $props['title'];
				}
				if ( isset( $props['shorttitle'] ) ) {
					$info['derivatives'][0]['shorttitle'] = $props['shorttitle'];
				}
			}

			$ret = array_merge( $ret, [ $normFileName => $info ] );
		}

		return $ret;
	}

	/** @inheritDoc */
	public function doPst( PageConfig $pageConfig, string $wikitext ): string {
		// FIXME: This is all mockAPI does
		return preg_replace( '/\{\{subst:1x\|([^}]+)\}\}/', '$1', $wikitext, 1 );
	}

	/** @inheritDoc */
	public function parseWikitext( PageConfig $pageConfig, string $wikitext ): array {
		// Render to html the contents of known extension tags
		preg_match( '#<([A-Za-z][^\t\n\v />\0]*)#', $wikitext, $match );
		switch ( $match[1] ) {
			case 'templatestyles':
				// Silliness
				$html = "<style data-mw-deduplicate='TemplateStyles:r123456'>" .
					"small { font-size: 120% } big { font-size: 80% }</style>";
				break;

			case 'translate':
				$html = $wikitext;
				break;

			case 'indicator':
			case 'section':
				$html = "\n";
				break;

			default:
				throw new Error( 'Unhandled extension type encountered in: ' . $wikitext );
		}

		return [
			'html' => $html,
			'modules' => [],
			'modulestyles' => [],
			'categories' => [],
		];
	}

	/** @inheritDoc */
	public function preprocessWikitext( PageConfig $pageConfig, string $wikitext ): array {
		$revid = $pageConfig->getRevisionId();
		$ret = [
			'modules' => [],
			'modulestyles' => [],
			'categories' => [],
			'properties' => [],
		];

		$expanded = str_replace( '{{!}}', '|', $wikitext );
		preg_match( '/{{1x\|(.*?)}}/s', $expanded, $match );

		if ( $match ) {
			$ret['wikitext'] = $match[1];
		} elseif ( $wikitext === '{{colours of the rainbow}}' ) {
			$ret['wikitext'] = 'purple';
		} elseif ( $wikitext === '{{REVISIONID}}' ) {
			$ret['wikitext'] = (string)$revid;
		} else {
			$ret['wikitext'] = '';
		}

		return $ret;
	}

	/** @inheritDoc */
	public function fetchTemplateSource(
		PageConfig $pageConfig, string $title
	): ?PageContent {
		$normTitle = $this->normTitle( $title );
		$pageData = self::$PAGE_DATA[$normTitle] ?? null;
		if ( $pageData ) {
			$content = [];
			foreach ( $pageData['slots'] as $role => $data ) {
				$content['role'] = $data['*'];
			}
			return new MockPageContent( $content );
		} else {
			return null;
		}
	}

	/** @inheritDoc */
	public function fetchTemplateData( PageConfig $pageConfig, string $title ): ?array {
		return self::TEMPLATE_DATA[$this->normTitle( $title )] ?? null;
	}

	/** @inheritDoc */
	public function logLinterData(
		PageConfig $pageConfig, array $lints
	): void {
		foreach ( $lints as $l ) {
			error_log( PHPUtils::jsonEncode( $l ) );
		}
	}
}
