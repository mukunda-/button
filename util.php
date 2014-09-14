<?php
//-----------------------------------------------------------------------------
function GetIPHex() {
	return bin2hex(inet_pton( $_SERVER['REMOTE_ADDR'] ));
}

?>