// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

//-----------------------------------------------------------------------------
function AdjustTop() {
	var poop = $('#topic');
	var height = poop.height() 
		+ parseInt(poop.css('padding-top'))
		+ parseInt(poop.css('padding-bottom'));
	var sh = $( window ).height();
	
	$("#goodbutton").css( "top", (height / 2 - 16) + "px" );
	$("#badbutton").css( "top", (height / 2 - 16) + "px" );
	
	$("#scorediv").css( "top", (height / 2 - 16) + "px" );
	$("#newbutton").css( "top", (height / 2 - 16) + "px" );
	height += 16; // body margin
	var margin = ((sh/2)-(height/2));
	if( margin < 32 ) {
		margin = 32;
	}
	poop.css( 'margin-top', margin + "px" );
}

//-----------------------------------------------------------------------------
function AdjustBottom() {
	if( $('#replies').length != 0 ) {
	
		var sh = $( window ).height();
		$('#padding').css( 'height', ((sh/2)) + "px" );
	}
}


//-----------------------------------------------------------------------------
function AdjustSize() {
	AdjustTop();
	AdjustBottom();
	
	var content_width = $(window).width() - 72 - 16; // - padding - body width
	
	if( content_width > 574 ) content_width = 574;
	if( content_width < 32 ) content_width = 32;
	
	$( '.replies .reply' ).css( 'max-width', content_width + 'px' );
}

matbox.AdjustSize   = AdjustSize;
matbox.AdjustTop    = AdjustTop;
matbox.AdjustBottom = AdjustBottom;

})();
