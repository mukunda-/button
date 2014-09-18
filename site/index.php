<?php

require_once 'config.php'; 
require_once 'minify.php';
  
?><!DOCTYPE html>
<html>
<head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta charset="UTF-8">
	
	<link href='http://fonts.googleapis.com/css?family=Noto+Sans:400,700' rel='stylesheet' type='text/css'>

	<link rel="stylesheet" href="min/style.min.css" type="text/css">
	
	<?php 
		function AddScript( $src ) {
			echo '<script src="'.$src.'"></script>';
		}
		
		AddScript( '//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js' );
		
		if( $DEBUG ) {
			AddScript( 'js/jquery.mousewheel.min.js' );
			AddScript( 'js/asyncgroup.js' );
			AddScript( 'js/matbox.js' );
			AddScript( 'js/loader.js' );
			AddScript( 'js/liverefresh.js' );
			AddScript( 'js/votecomment.js' );
			AddScript( 'js/votetopic.js' );
			AddScript( 'js/sizeadjust.js' );
			AddScript( 'js/navbar.js' );
		} else {
			AddScript( 'min/matbox.min.js' ); 
		}
	?>
	
	<title>matbox - the matter machine</title>
	
</head>
<body>	
	<div id="magicbox"></div>
	<div id="content">
		
	</div>
	<div id="navigation"></div>
</body>
</html>