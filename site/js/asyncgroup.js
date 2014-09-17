(function() { 

/** ---------------------------------------------------------------------------
 * AsyncGroup class
 *
 * Handles grouping and cancelling of asynchronous methods.
 */
function AsyncGroup() {
	this.m_next_id = 0;
	this.m_handles = {}; 
	this.m_ajax = {};
}

//-----------------------------------------------------------------------------
AsyncGroup.prototype.GetNextID = function() {
	var id = 'h' + this.m_next_id;
	this.m_next_id++;
	return id;
}

/** ---------------------------------------------------------------------------
 * Set a new timeout.
 *
 * @param handler Timeout handler to call when the delay expires.
 * @param delay   Delay in milliseconds.
 * @return        ID of timeout, which can be used with Clear(...)
 */
AsyncGroup.prototype.Set = function( handler, delay ) {
	var id = GetNextID();
	
	var group = this;
	this.m_handles[id] = setTimeout( function() {
		delete group.m_handles[id];
		handler();
	}, delay );
	
	return id;
}

/** ---------------------------------------------------------------------------
 * Clear (cancel) a timeout.
 *
 * @param id ID returned from Set(...)
 * @return   true if the timeout was cancelled, false if the timeout already
 *           triggered or never existed.
 */
AsyncGroup.prototype.Clear = function( id ) {
	if( this.m_handles.hasOwnProperty( id ) ) {
		clearTimeout( this.m_handles[id] );
		delete this.m_handles[id];
		return true;
	}
	return false;
}

/** ---------------------------------------------------------------------------
 * Clear (cancel) all pending calls in this group.
 *
 * All IDs are invalidated.
 */
AsyncGroup.prototype.ClearAll = function() {
	for( var id in this.m_handles ) {
		clearTimeout( this.m_handles[id] );
    }
	this.m_handles = {};
	for( var id in this.m_ajax ) {
		this.m_ajax[id].abort();
    }
	this.m_ajax = {};
}

/** ---------------------------------------------------------------------------
 * Add an ajax handle to this group.
 *
 * Any active handles added to the group will be aborted by CancelAll.
 *
 * Failure handlers should check for aborted status and cancel their operation
 * accordingly.
 *
 * @param handle jqXHR object.
 * @return       ID of ajax request
 */
AsyncGroup.prototype.AddAjax = function( handle ) {
	var id = GetNextID();
	this.m_ajax[id] = handle;
	
	handle.always( function() {
		RemoveAjax( id );
	});
	
	return handle;
}

/** ---------------------------------------------------------------------------
 * Remove an ajax ID from this group.
 *  
 * @param id ID returned from AddAjax
 * @return   true if the id was removed, false if the ajax request already
 *           finished or doesn't exist.
 */
AsyncGroup.prototype.RemoveAjax = function( id ) {
	if( this.m_ajax.hasOwnProperty( id ) ) {
		this.m_ajax[id].abort(); 
		delete this.m_ajax[id];
		return true;
	}
	return false;
}

/** ---------------------------------------------------------------------------
 * [global] Create a new AsyncGroup.
 *
 * @return New AsyncGroup.
 */
window.AsyncGroup.Create = function() {
	return new AsyncGroup();
}


})();
