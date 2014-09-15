<?php
 
require_once "sql.php";
require_once "config.php";
require_once "util.php";

$MAXCHARS = 220;
$MAXLINES = 8;

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
	
	if( CheckTopicExpired( $page, $challenge ) ) {
		exit( 'expired' );
	}
	
	// sanitize text: 
	$text = $_POST['text'];
	$text = str_replace( '[[br]]', "\n", $text );
	$text = trim($text);
	if( $text == "" ) exit( 'tooshort' ); 
	$text = htmlspecialchars($text); // escape html codes
	$text = nl2br( $text, false ); // convert newlines to html
	if( strlen( $text ) > $MAXCHARS || 
			substr_count( $text, "<br>" ) > $MAXLINES ) {
		exit( 'toolong' );
	}
	
	
	$sql = GetSQL();
	$s_live = TopicStates::Live;
	$sql->safequery( "LOCK TABLES Topics READ, Comments WRITE" );
	$result = $sql->safequery( 
		"SELECT state FROM Topics ".
		" WHERE id=$page AND challenge=$challenge" );
	
	if( $result->num_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' );
		
	}
	
	$row = $result->fetch_row();
	if( $row[0] == TopicStates::Old || $row[0] == TopicStates::Deleted ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'toolate' );
	}
	 
	$xip = GetIPHex();
	$text = $sql->real_escape_string( $text );
	$sql->safequery( "INSERT INTO Comments (topic,ip,goods,bads,time,content) ".
					 " VALUES ($page,x'$xip',0,0,".time().",'$text')" );
				
	if( $sql->affected_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' );
	}
	
	$sql->safequery( "UNLOCK TABLES" );
	
	exit( 'okay.' );
	
} catch ( Exception $e ) {
	
}
exit( 'error' );
?>