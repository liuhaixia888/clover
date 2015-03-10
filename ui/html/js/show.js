var Tab = function(config){
	this.defaultConfig = {
		el : '.btn',
		wrap : '.sec-lft',
		elTarget : '.sublist',
		className : 'btn-down',
		parents : 'li'
	};
	this.config = $.extend(this.defaultConfig, config || {});
	this.init.call(this);
};
Tab.prototype = {
	init: function(){
		this._tab();
	},
	_tab: function(){
		var el = this.config.el, 
		wrap = this.config.wrap,
		parents = this.config.parents,
		elTarget = this.config.elTarget
		className = this.config.className;

		$(wrap).delegate(el , 'click', function(e){
			var _this = $(e.currentTarget),  
				selected = _this.hasClass(className), 
				_elTarget = _this.parents(parents).find(elTarget);
			if(selected){
				_this.removeClass(className);
				_elTarget.hide();
			}else{
				_this.addClass(className);
				_elTarget.show();
			}

		});
	}

};