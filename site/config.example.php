<?php

$apath = rtrim(dirname($_SERVER['PHP_SELF']), '/\\').'/'; 

$SLOTS = 1; // number of discussions that can be performed
            // concurrently.

$COMPOSE_TIMEOUT = 60*5+4; // number of seconds a composition
                         // has to be submitted before it is
						 // deleted
 
$BURY_TIME = 60*5;

$OLD_TIME = 60*30;

$ACCOUNTS_PER_IP = 1;

$SCORE_RAMP_CONSTANT = 10; // CHANGE TO HIGHER LATER.

//$DEBUG=1;

 ?>