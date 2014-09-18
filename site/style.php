<?php

require_once "cssmin-v3.0.1-minified.php";

function GenerateStyle() {

	$files = array(
		'css/button.css'
	);
	
	$output = 'style.css';
	
	//----------------------------------------------------------
	$uptodate = true;
	if( file_exists( $output ) ) {
		$gentime = filemtime( $output );
		
		foreach( $files as $file ) {
			 
			if( filemtime( $file ) > $gentime ) {
				$uptodate = false;
				break;
			}
			
		}
		if( $uptodate ) return;
		unlink( $output );
	}
	
	
	$css = "";
	foreach( $files as $file ) {
		$css .= file_get_contents( $file ) . '\n\n';
	}
	
	
	$stylevars = array(
		"BGCOLOR" => "#00B4FF",
		"WINDOW" => "#e6f8ff"
	);
	
	foreach( $stylevars as $key => $value ) {
		$css = str_replace( "[$key]", $value, $css );
	}
	
	$css = CssMin::minify( $css );
	file_put_contents( $output, $css );
}
   
?>