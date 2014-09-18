<?php
 
require_once "sql.php";
require_once "config.php";
require_once "util.php";

$MAXCHARS = 220;
$MAXLINES = 8;

$WAITTIME = 30;

// reply.php POST { text: reply text, serial: account serial }

//-----------------------------------------------------------------------------
try {
	
	if( !isset( $_POST['text'] ) ||
			!isset( $_POST['page'] ) ) {
		
		exit( 'error' );
	}
	
	$g_account = LogIn();
	
	if( $g_account->page != $_POST['page'] ) {
		exit( 'wrongpage' );
	}
	
	if( CheckTopicExpired( $g_account->page ) ) {
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
	$sql->safequery( 'LOCK TABLES Topics READ, Comments WRITE, Accounts WRITE' );
	
	$result = $sql->safequery( 'SELECT lastreply FROM Accounts WHERE id='.$g_account->id );
	$row = $result->fetch_row();
	if( time() < $row[0] + $WAITTIME ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'pleasewait' );
	}
	
	$result = $sql->safequery( 
		'SELECT state FROM Topics
		WHERE id='.$g_account->page );
		
	if( $result->num_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' );
		
	}
	
	$row = $result->fetch_row();
	if( $row[0] == TopicStates::Old || 
			$row[0] == TopicStates::Deleted ) {
		
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'expired' );
	}
	 
	$text = $sql->real_escape_string( $text );
	$sql->safequery( 
		'INSERT INTO Comments (topic,account,goods,bads,time,content) 
		VALUES ('.$g_account->page.','.$g_account->id.',0,0,'.time().",'$text')" );
				
	if( $sql->affected_rows == 0 ) {
		// not sure how the above would error..?
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' );
	}
	
	$sql->safequery( 'UPDATE Accounts SET lastreply='.time().' WHERE id='.$g_account->id );
	$sql->safequery( 'UNLOCK TABLES' );
	
	exit( 'okay.' );
	
} catch ( Exception $e ) {
	LogException( "reply", $e );
	
}
exit( 'error' );
?>