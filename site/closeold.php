<?php

require_once "sql.php";
require_once "config.php";
require_once "util.php";

try {
	if( !isset( $_POST['page'] ) ) {
		exit( 'error' );
	}
	
	$g_account = LogIn();
	if( $g_account->page != $_POST['page'] ) {
		exit( 'wrongpage' );
	}
	
	$sql = GetSQL();
	$sql->safequery( 
		'UPDATE Accounts SET page=0 WHERE id='.$g_account->id );

	exit('okay.');
} catch( Exception $e ) {
	LogException( "closeold", $e );
}

exit('error');
?>