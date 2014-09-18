// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

// VoteTopic
// module for submitting votes on topics/matter

var m_topic_voted = false;

function VoteTopic( upvote ) {
	if( m_topic_voted ) return;
	m_topic_voted = true;
	
	var vgood = $("#goodbutton");
	var vbad = $("#badbutton");
	
	if( upvote ) {
		vgood.html( '<img src="star.png" alt="good" title="good">' );
	} else {
		vbad.html( '<img src="bad.png" alt="bad" title="bad">' );
	}
	vgood.removeClass( "clickable" );
	vbad.removeClass( "clickable" );
	
	$.post( 'topicvote.php', 
		{ page: matbox.GetPage(),  
		  vote: upvote ? 'good':'cancer' } )
		.done( function( data ) {
			alert(data);
			if( data == 'error' ) {
				RefreshContent(); 
			} else if( data == 'good' ) {
				// do nothing.
			} else if( data == 'cancer' ) {
				// will get new topic.
				RefreshContent(); 
			} else if( data == 'expired' ) {
				RefreshContent(); 
			}
		})
		.fail( function(  ) {
		
			m_topic_voted = false;
			vgood.html( '<img src="unstar.png" alt="good" title="good">' );
			vbad.html( '<img src="notbad.png" alt="bad" title="bad">' );
			
			vgood.addClass( "clickable" );
			vbad.addClass( "clickable" );
			
		});
}

/** ---------------------------------------------------------------------------
 * Vote a topic "good"
 *
 * The user account's live page must match the topic page.
 */
matbox.VoteTopicGood = function() {
	VoteTopic( true );
}

/** ---------------------------------------------------------------------------
 * Vote a topic "bad"
 *
 * The user account's live page must match the topic page. 
 */
matbox.VoteTopicBad = function() {
	VoteTopic( false );
}

matbox.ResetTopicVoted = function() {
	m_topic_voted = false;
}

})();
