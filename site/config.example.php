<?php

// absolute path to site directory
// ie /button/site/
$apath = rtrim(dirname($_SERVER['PHP_SELF']), '/\\').'/'; 

$SLOTS = 1; // number of discussions that can be performed
            // concurrently.

$COMPOSE_TIMEOUT = 60*5+4; // number of seconds a composition
                         // has to be submitted before it is
						 // deleted
 
$BURY_TIME = 60*5; // time before a topic is buried (below score threshold)
$OLD_TIME = 60*30; // time before a topic is olded (above score threshold)
$ACCOUNTS_PER_IP = 1; // if a known ip connects without a cookie, he will either
						// be assigned a new account if there is a free slot (controlled
						// by this threshold, or one of the existing accounts randomly
$SCORE_RAMP_CONSTANT = 10; // amount of votes required to have a full score (Change to higher later!)
$ERRLOG = 1;			// log exceptions to err.log
$COMPOSE_DELAY = 60*10; // seconds to wait after composing before being allowed to compose again.
//$DEBUG=1;				// allow debug functions (setup.php!)

 ?>