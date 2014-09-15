<?php

require_once "sql.php";
require_once "config.php";
require_once "util.php";
$MAXCHARS = 254;
$MAXLINES = 15;

//-----------------------------------------------------------------------------
try {

	if( !isset( $_POST['text'] ) ||
		!isset( $_POST['challenge'] ) ||
		!isset( $_POST['page'] ) ||
			!isset($_COOKIE['challenge']) || 
			!isset($_COOKIE['page']) ) {
		
		exit( 'error' );
	}
	
	$challenge = ReadCookieInt( 'challenge' );
	$page = ReadCookieInt( 'page' );
	if( $challenge != $_POST['challenge'] ||
		$page != $_POST['page'] ) {
		
		exit( 'wrongpage' );
	}
	
	// arduous text sanitation:
	$text = $_POST['text'];
	$text = str_replace( '[[br]]', "\n", $text );
	$text = trim($text);
	if( $text == "" ) exit( 'empty' ); 
	$text = htmlspecialchars($text); // escape html codes
	$text = nl2br( $text, false ); // convert newlines to html
	if( strlen( $text ) > $MAXCHARS || 
			substr_count( $text, "<br>" ) > $MAXLINES ) {
			
		exit( 'toolong' );
	}
	
	$sql = GetSQL();
	$text = $sql->real_escape_string( $text );
	$s_live = TopicStates::Live;
	$time = time();
	$sql->safequery( "
			UPDATE Topics SET state=". TopicStates::Live . ",
			content='$text', time=$time WHERE id=$page AND challenge=$challenge
			AND state=".TopicStates::Composing );
			
	if( $sql->affected_rows == 0 ) {
		exit( 'expired' );
	}
	exit( 'okay.' );
	
} catch ( Exception $e ) {	
	
}
exit( 'error' );

?>