<?php

echo '<div class="topic nothing" id="topic">';
	if( isset( $_GET['expired'] ) ) {
		echo 'you took too long.';
	} else if( isset( $_GET['emptycomposition'] ) ) {
		echo 'that didn\'t work.';
	} else if( isset( $_GET['toolong'] ) ) {
		echo 'that was too long.';
	} else if( isset( $_GET['messedup'] ) ) {
		echo 'something messed up.';
	}
echo '</div>';
?>