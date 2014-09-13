<?php

$apath = rtrim(dirname($_SERVER['PHP_SELF']), '/\\').'/'; 

$SLOTS = 1; // number of discussions that can be performed
            // concurrently.

$COMPOSE_TIMEOUT = 60*5; // number of seconds a composition
                         // has to be submitted before it is
						 // deleted
 
 ?>