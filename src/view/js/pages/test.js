/*

	模块
	核心功能拆分为模块，模块各自处理事件绑定，功能实现: page.exports(id, fn)
	模块调用绝对路径: page.app[id]

	通信
	消息发布者: listen.fire(id)
	消息订阅者: listen.on(id, fn)

 */

define(['zepto', 'page', 'cache', 'dragDom', 'listen', 'parser'], function($, Page, Cache, dragDom, Listen, Parser){
	var page = new Page;
	var cache = new Cache;
	var listen = new Listen;
	var parser = new Parser;
	var app = page.app;

	var selected = 'selected';
	var _selected = '.selected';
	var isAnimating = false;


	String.prototype.toNumber = function(){
		return Number(this.replace('px', ''))
	};

	Number.prototype.toNumber = function(){
		return this
	};


	// onload方法外定义模块位置可随意
	// onload方法内定义模块需要位置提前，以保证程式执行顺序
	page.onload(function(){

		// 订阅Form-data保存
		listen.on('save', function(){
			// 检查动画状态，如果正处于动画过程，则不再响应新的保存请求
			if(isAnimating) return;

			app.form.save();
			console.log('form data save')
		});

		// 订阅动画播放
		listen.on('play', function(){
			// 检查动画状态，如果正处于动画过程，则不再响应新的预览请求
			if(isAnimating) return;
			isAnimating = true;

			// 开始播放动画
			app.animate.play();
			console.log('animate play')
		});


		// 公共方法模块定义
		this.exports('base', {

			// 用于item切换
			slideItem: function(obj){
				$(obj).addClass(selected).siblings(_selected).removeClass(selected);
			}
		});

		// 当前环境变量模块
		this.exports('current', {
			// 返回当前画布对象
			canvas: function(){
				return $('#dragCanvas')
			},

			// 返回当前动画对象
			element: function(){
				return this.canvas().find(_selected)
			},

			// 返回当前动画对象guid
			guid: function(){
				return this.element().attr('guid')
			},

			// 返回当前动画对象动画数据
			animate: function(){
				return cache.inputValue[this.guid()]
			},

			// 返回当前关键帧
			process: function(){
				return $('.animate-process').find(_selected).attr('value');
			}
		});

		// Form data 模块
		// 动画数据模型创建
		this.exports('form', function(){

			// 动画轨迹事件处理
			$('#slideOptions').delegate('i', 'click', function(){
				// 更新item状态
				app.base.slideItem(this);
				// 同步更新隐藏表单值
				$(this).parent().siblings('[sign="function"]').val(this.innerText);

				// 保存并预览
				listen.fire('save');
				listen.fire('play');
			});

			// 处理range控件
			$('.effect-label').delegate('input[type="range"]', 'input', function(){
				var value, algorithm, unit;

				// 获取倍数
				algorithm = this.getAttribute('algorithm') || 1;
				// 获取单位
				unit = this.getAttribute('unit') || '';
				// 获取最终结果
				value = (this.value * algorithm).toString().slice(0, 4) + unit;

				$(this).prev('input[type="text"]').val(value)
			});

			return {
				// 获取动画数据
				// 动画数据模型创建
				getData: function(guid){
					var guid = guid || app.current.guid();
					var dataModel = {
						init: {},
						base: {},
						frames: {},
						place: {},
						guid: guid
					};
					typeof cache.inputValue[guid] === 'object' ? '' : cache.inputValue[guid] = dataModel;
					return cache.inputValue[guid];
				},

				// 保存表单数据
				save: function(data){
					this.saveBase();
					this.saveFrames();

					this.savePlace();
				},

				// 保存基础数据
				saveBase: function(data){
					data = this.getData(app.current.guid());
					// 获取动画基础数据
					$('.animate-args').find('input[sign]').each(function(){
						data.base[this.getAttribute('sign')] = this.value;
					});
					// 扩展动画基础数据
					$.extend(data.base, {
						className: '.fadeIn[guid="'+ data.guid +'"]',
						name: 'Clover-' + data.guid,
						count: 1,
						mode: 'forwards' // backwards || forwards || both
						// 当mode的值为forwards时，动画结束时需要删除动画类fadeIn，并初始化0%的绝对位置，以达到重置动画位置的目的（推荐）
						// 当mode的值为backwards时，动画结束时，只需要初始化0%的绝对位置即可达到重置动画位置的目的
						// in the app.animate form module animate
					});
				},

				// 保存关键帧数据
				saveFrames: function(data, process){
					data = this.getData(app.current.guid());
					process = app.current.process();
					data.frames[process] ? '' : data.frames[process] = {};
					$('.animate-effect').find('input[sign]').each(function(){
						data.frames[process][this.getAttribute('sign')] = this.value;
					});
				},

				// 保存位置信息
				savePlace: function(data){
					data = this.getData(app.current.guid());
					process = app.current.process();
					data.place[process] ? '' : data.place[process] = {};

					data.place[process].left = app.current.element().css('left');
					data.place[process].top = app.current.element().css('top');

					this.calcPlace(data);
				},

				calcPlace: function(data){
					var width, height, data;
					data = data || this.getData(app.current.guid());
					if(!$.isEmptyObject(data.place['0%'])){
						width = app.current.element().width();
						height = app.current.element().height();
						// 计算当前位移
						$.each(data.place, function(key, value){
							var left = value.left.toNumber();
							var top = value.top.toNumber();
							var x = left/width*100;
							var y = top/height*100;
							var z = 0;

							x == 0 ? '' : x += '%';
							y == 0 ? '' : y += '%';

							data.frames[key].translate3d = x + ',' + y + ',' + z;
						});
					}
				},

				// 重播动画基础数据
				replayBase: function(guid){
					guid = guid || app.current.guid();
					$.each(cache.inputValue[guid].base, function(key, value){
						$('.animate-args').find('input[sign="'+ key +'"]').val(value)
					})
				},

				// 重播动画帧数据
				replayProcess: function(guid, process){
					guid = guid || app.current.guid();
					process = process || '0%';
					$.each(cache.inputValue[guid].frames[process], function(key, value){
						$('.animate-effect').find('input[sign="'+ key +'"]').val(value)
					})
				},

				// 重播动画位置
				replayPlace: function(guid, process){
					var data = this.getData(app.current.guid());
					var guid = guid || app.current.guid();
					var process = process || '0%';
					app.current.element().css({left: data.place[process].left, top: data.place[process].top})
				},

				replay: function(guid){
					this.replayBase(guid);
					this.replayProcess(guid);
				}
			}
		});

		// Dom拖拽模块
		this.exports('dragDom', {
			// 绑定动画元素拖拽事件
			on: function(tag, src) {
				var x, xm, y, ym, canvas, ap;

				// 检查是否存在src
				// 如果有src则异步load图片
				// 图片加载完成之后绑定拖拽事件
				if(src){
					return this.loadImg(src, function(){
						app.dragDom.on(tag)
					})
				};

				// 绑定拖拽事件
				ap = $(tag);
				canvas = app.current.canvas();

				x = 0;
				y = 0;
				xm = x + canvas.width() - ap.width();
				ym = y + canvas.height() - ap.height();

				dragDom.init(document.querySelector(tag), null, x, xm, y, ym);
			},

			// 加载图片
			loadImg: function(src, callback){
				var img = new Image();
				img.src = src;
				img.onload = callback || function(){};
			}
		});

		// 动画操作模块
		// 包括直接或间接针对动画对象的操作
		this.exports('animate', function(){
			var animateProcess = $('.animate-process');

			// 监听动画元素click事件
			app.current.canvas().delegate('.ap', 'click', function(){
				this.guid = this.getAttribute('guid');
				this.prev = app.current.element();
				this.prev.guid = app.current.guid();

				// 检查是否已存在动画对象
				// 检查动画对象是否更新
				if(cache.inputValue[this.guid] && this.guid !== this.prev.guid){
					// 条件为真
					// 重播当前动画对象数据
					app.form.replay(this.guid);
					// 切换到第一关键帧，防止数据重播失败
					animateProcess.find('.btn[value="0%"]').addClass(selected).siblings(_selected).removeClass(selected);
				};

				// 更新当前动画对象状态
				app.base.slideItem(this);
			});

			// 保存并预览
			$('#btnPlay').on('click', function(){
				listen.fire('save');
				listen.fire('play');
			});

			// 切换关键帧
			animateProcess.delegate('.btn', 'click', function(){
				var guid = app.current.guid();

				// 发布数据保存事件
				listen.fire('save');

				// 重播当前帧数据
				if(cache.inputValue[guid] && cache.inputValue[guid].frames[this.value]){
					app.form.replayProcess(guid, this.value);
					app.form.replayPlace(guid, this.value);
				};

				// 更新当前动画关键帧状态
				app.base.slideItem(this);
			});

			// 动画播放完成动作
			app.current.element().get(0).addEventListener('webkitAnimationEnd', function(){
				var self = this;

				// 注销入场动画
				setTimeout(function(){
					// 清理动画类
					$(self).removeClass('fadeIn');
					// 更新动画停驻位置为100%
					app.animate.toProcess('100%');

					// 重置动画状态
					isAnimating = false;
				}, 200)
				// app.animate.initPlace();
			}, false);

			return {
				// 动画绝对定位位置清零
				clearPlace: function(){
					app.current.element().css({left: 0, top: 0})
				},

				// 初始化动画绝对定位位置
				initPlace: function(){
					var data = app.current.animate();
					app.current.element().css({left: data.place['0%'].left, top: data.place['0%'].top})
				},

				// 跳转到指定帧
				toProcess: function(process){
					process = process || '0%';
					animateProcess.find('.btn[value="'+process+'"]').click();
				},

				// 返回指定guid动画对象
				element: function(guid){
					return app.current.canvas().find('.ap[guid="'+ guid +'"]');
				},

				// 创建clover style
				createCloverStyle: function(){
					return $('<style data-id="clover"></style>')
				},

				// 渲染animate style
				render: function(data){
					var style = $('style[data-id="clover"]');
					style.length === 0 ? style = this.createCloverStyle() : '';
					style.html(data);
					$('head').append(style);
				},

				playAnimate: function(guid){
					var css;
					guid = guid || app.current.guid();
					css = parser.render(cache.inputValue);
					// 渲染css
					this.render(css);
					// 执行动画
					this.element(guid).removeClass('fadeIn').reflow().addClass('fadeIn');
				},

				play: function(){
					// 回归第一帧，回归0%位置，为动画开始做准备
					this.toProcess();
					// 清理动画元素绝对定位产生的位置信息，为动画开始做准备
					this.clearPlace();
					// 开始播放动画
					this.playAnimate();
				}
			}
		});

		// 时间轴
		this.exports('timeline', {

		});

		// this.exports('control')

	});

	page.onload(function(){

		this.extend({
			init: function(){
				app.dragDom.on('.ap.selected');
			},

			bind: function(){
				window.onresize = function(){
					app.dragDom.on('.ap.selected');
				}
			},

			render: function(){

			}
		});


	});


	page.reg();

	page.cache = cache;
	window.page = page;
});