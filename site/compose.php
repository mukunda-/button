<?php

require_once "sql.php";
require_once "config.php";
require_once "util.php";
$MAXCHARS = 254;
$MAXLINES = 15;

// compose.php POST { serial, text }

//-----------------------------------------------------------------------------
try {

	if( !isset( $_POST['text'] ) ||
		!isset( $_POST['serial'] ) ) {
		
		exit( 'error' );
	}
	
	$g_account = LogIn();
	
	if( $g_account->serial != $_POST['serial'] ) {
		exit( 'wrongpage' );
	}
	
	// arduous text sanitization:
	$text = $_POST['text'];
	$text = str_replace( '[[br]]', "\n", $text ); // convert marked newlines to real newlines
	$text = trim($text); // trim whitespace
	if( $text == "" ) exit( 'empty' );  // error if empty
	$text = htmlspecialchars($text); // escape html chars
	$text = nl2br( $text, false ); // convert newlines to html
	if( strlen( $text ) > $MAXCHARS || 
			substr_count( $text, "<br>" ) > $MAXLINES ) {
		// too many lines or too many characters.
			
		exit( 'toolong' );
	}
	
	$sql = GetSQL();
	$text = $sql->real_escape_string( $text );
	$sql->safequery( "
			UPDATE Topics SET state=". TopicStates::Live . ",
			content='$text', time=".time()." WHERE id=".$g_account->page."
			AND state=".TopicStates::Composing );
			
	$sql->safequery( "UPDATE Accounts SET serial=serial+1 WHERE id=". $g_account->id );
			
	if( $sql->affected_rows == 0 ) {
		// their composition slot was deleted because
		// they took too long.
		exit( 'expired' );
	}
	exit( 'okay.' );
	
} catch ( Exception $e ) {	
	LogException( "compose", $e );
	
}
exit( 'error' );

?>