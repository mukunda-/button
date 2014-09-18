// ==== matbox ====
// Copyright 2014 Mukunda Johnson

(function() { window.matbox = window.matbox || {};

// Loader
// module for loading pages in place

matbox.Loader = this;

var FADE_OUT_TIME = 500; // not the actual fadeout time (set in css)
var FADE_IN_TIME = 500;  // only used to control timeout delays

var m_loading = false;  // loading is set while a new page is being loaded
						// this includes the time between the call to Load
						// until the loaded content is initialized and
						// fading in
						
var m_fading_out = false;  // used to coordinate fadeout and ajax result
var m_page_content = null; //

// error content when the ajax fails:
var PAGE_LOAD_FAILED_CONTENT = 
	'<div class="topic nothing" id="topic">'+
		'something messed up.'+
	'</div><!-- (the page failed to load.) -->';
	 
/** ---------------------------------------------------------------------------
 * Set the page content and fade in.
 *
 * @param content Content to insert into #content.
 *
 */
function FadeIn( content ) {	
	// global initialization here:
	matbox.InitializePreLoad();
	
	output = $('#content');
	$('#content').html( content );
	
	matbox.InitializePostLoad();
	m_loading = false;
	
	matbox.AdjustSize();
	output.css( 'opacity', 1 ); // fade in
}

/** ---------------------------------------------------------------------------
 * Load a content page.
 *
 * @param url URL of page to load.
 * @param delay Used to control the Extra Dramatic Break Effect.
 *              negated values are treated as negated absolute values
 *              positive values are added to the normal fade constant
 */
this.Load = function( url, delay ) {
	if( m_loading ) return;

	if( !isSet(delay) ) delay = 500;
	if( delay < 0 ) delay = -delay - FADE_OUT_TIME; 
	
	m_loading = true;
	
	matbox.LiveRefresh.Reset(); 
	
	output = $( '#content' );
	output.css( 'opacity', 0 ); // fade out
	
	m_fading_out = true;
	
	// whichever one of these finishes first (fadeout/ajax)
	// thats the one that sets the content and fades in
	setTimeout( 
		function() {
			m_fading_out = false; 
			if( m_page_content != null ) {
				FadeIn( m_page_content );
				m_page_content = null;
			} else {
				// we finished first, prime the output.
				output.html("");
			}
		}, FADE_OUT_TIME+delay );
	
	$.get( url )
		.done( function(data) {
			
			if( m_fading_out ) {
				m_page_content = data;
			} else {
				FadeIn( data );
				
			}
		})
		.fail( function() {
			if( g_loading_fading_out ) {
				m_page_content = PAGE_LOAD_FAILED_CONTENT;
			} else {
				FadeIn( PAGE_LOAD_FAILED_CONTENT );
			}
		});
	
}

/** ---------------------------------------------------------------------------
 * Reload content.php
 */
this.RefreshContent = function() {
	this.Load( 'content.php' );
}

/** ---------------------------------------------------------------------------
 * Check if a page is loading
 *
 * @return true if the page is fading out or otherwise busy loading.
 */
this.IsLoading = function() {
	return m_loading;
}

/** ---------------------------------------------------------------------------
 * Set the loading flag, to freeze the page for an imminent pageload. 
 */
this.SetLoading = function() {
	m_loading = true;
}

})();
