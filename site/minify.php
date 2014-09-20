<?php

namespace Minify;
 
spl_autoload_register(function ($class) {
	if( $class === "CssMinifier" ) {
		require_once 'libs/cssmin-v3.0.1-minified.php';
	} else if( $class === "JShrink\Minifier" ) {
		require_once 'libs/JShrink/Minifier.php';
	}
});


$CSS_FILES = array(
	'css/button.css',
	'css/navbar.css',
	'css/topic.css',
	'css/replies.css',
	'css/rankcolors.css',
	'css/help.css',
	'css/panel.css',
	'css/image.css'
);

$CSS_OUT = "min/style.min.css";

$CSS_VARS = array(
	"BGCOLOR" => "#00B4FF",
	"WINDOW" => "#e6f8ff",
	"NOUSERSELECT" => "-webkit-touch-callout: none;
						-webkit-user-select: none;
						-khtml-user-select: none;
						-moz-user-select: none;
						-ms-user-select: none;
						user-select: none;"
	
);

$JS_FILES = array(
	'js/asyncgroup.js',
	'js/jquery.mousewheel.min.js',
	'js/liverefresh.js',
	'js/loader.js',
	'js/matbox.js',
	'js/navbar.js',
	'js/sizeadjust.js',
	'js/votecomment.js',
	'js/votetopic.js'
);

$JS_OUT = "min/matbox.min.js";

//-----------------------------------------------------------------------------
function OutOfDate( $file_list, $target ) {
	if( !file_exists( $target ) ) return true;
	$gentime = filemtime( $target );
	foreach( $file_list as $file ) {
		if( filemtime( $file ) > $gentime ) {
			unlink( $target );
			return true;
		}
	}
	return false;
}

//-----------------------------------------------------------------------------
function MergeContents( $file_list ) {	
	$content = '';
	foreach( $file_list as $file ) {
		$content .= file_get_contents( $file ) . "\n\n";
	}
	return $content;
}

//-----------------------------------------------------------------------------
function GenerateStyle() {
	global $CSS_FILES, $CSS_OUT, $CSS_VARS;
	
	if( !OutOfDate( $CSS_FILES, $CSS_OUT ) ) return;
	
	$css = MergeContents( $CSS_FILES ); 
	
	foreach( $CSS_VARS as $key => $value ) {
		$css = str_replace( "[$key]", $value, $css );
	}
	
	$css = new \CssMinifier( $css );
	file_put_contents( $CSS_OUT, $css->getMinified() );
}

//-----------------------------------------------------------------------------
function GenerateScript() {
	global $JS_FILES, $JS_OUT;
	
	if( !OutOfDate( $JS_FILES, $JS_OUT ) ) return;
	$js = MergeContents( $JS_FILES ); 
	
	$js = \JShrink\Minifier::Minify( $js );	
	file_put_contents( $JS_OUT, $js );
	
}

//-----------------------------------------------------------------------------
function Run() {
	if( !file_exists('min') ) {
		mkdir( 'min', 0755 );
	}
	
	GenerateStyle();
	GenerateScript();
}

Run();
   
?>