// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

// VoteComment module
// for submitting votes on comments

matbox.VoteComment = this;

//-----------------------------------------------------------------------------
function VoteComment( id, upvote ) {
	var vgood = $( '#votegood' + id );
	var vbad = $( '#votebad' + id );
	
	if( upvote ) {
		if( vgood.hasClass( 'selected' ) ) return; // already voted.
	} else {
		if( vbad.hasClass( 'selected' ) ) return; // already voted.
	}
	
	if( upvote ) {
		vgood.addClass( 'selected' );
		vbad.removeClass( 'selected' );
		vgood.html( '<img src="star.png">' );
		vbad.html( '<img src="notbad.png">' );
	} else {
		vgood.removeClass( 'selected' );
		vbad.addClass( 'selected' );
		vgood.html( '<img src="unstar.png">' );
		vbad.html( '<img src="bad.png">' );
	}
	
	$.post( 'commentvote.php', 
		{ page: matbox.GetPage(),
		  comment: id, 
		  vote: upvote ? 'good':'cancer' } );
		  
	// ignore result.
	// not really a problem if a few of these votes get missed.
	
}

/** ---------------------------------------------------------------------------
 * Vote a comment "good"
 *
 * User "live-page" must match comment's live page.
 *
 * @param id ID of comment
 */
this.Good = function( id ) {
	VoteComment( id, true );
}

/** ---------------------------------------------------------------------------
 * Vote a comment "bad"
 *
 * User "live-page" must match comment's live page.
 *
 * @param id ID of comment
 */
this.Bad = function( id ) {
	VoteComment( id, false );
}

})();
