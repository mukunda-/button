<?php
 
require_once "sql.php";
require_once "topic_states.php";
require_once "config.php";
$MAXCHARS = 254;
$MAXLINES = 15;

//-----------------------------------------------------------------------------
function ReadCookieInt( $key ) {
	if( !isset($_COOKIE[$key]) ) return 0;
	return is_numeric($_COOKIE[$key]) ? (int)$_COOKIE[$key] : 0;
}

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
	
	// sanitize text:
	
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
	$sql->safequery( "UPDATE Topics SET state=". TopicStates::Live ." ,".
					 " content='$text' WHERE id=$page AND challenge=$challenge ".
					 " AND state=".TopicStates::Composing );
	if( $sql->affected_rows == 0 ) {
		exit( 'expired' );
	}
	exit( 'okay.' );
	
} catch ( Exception $e ) {
}
exit( 'error' );

?>