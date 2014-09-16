<?php

require_once "sql.php";
require_once "config.php";
require_once "util.php";

try {
	if( !isset( $_POST['serial'] ) ) {
		exit( 'error' );
	}
	
	$g_account = LogIn();
	if( $g_account->serial != $_POST['serial'] ) {
		exit( 'wrongpage' );
	}
	
	$sql = GetSQL();
	$sql->safequery( 
		'UPDATE Accounts 
		SET page=0, serial=serial+1
		WHERE id='.$g_account->id );

	exit('okay.');
} catch( Exception $e ) {
}

exit('error');
?>