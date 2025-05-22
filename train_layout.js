// 全局变量
let canvas;
let currentImageId = null;
let originalImageWidth = 0;
let originalImageHeight = 0;
let isDrawingMode = false;
let currentClass = 'text'; // 默认类别
let scaleX = 1;
let scaleY = 1;
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentRect = null;
let rectangles = [];

// DOM元素
const fileInput = document.getElementById('file-input');
const classSelector = document.getElementById('class-selector');
const drawingModeToggle = document.getElementById('drawing-mode-toggle');
const saveTrainingBtn = document.getElementById('save-training-btn');
const deleteRectBtn = document.getElementById('delete-rect-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const startTrainingBtn = document.getElementById('start-training-btn');
const canvasContainer = document.getElementById('canvas-container');
const noImageText = document.getElementById('no-image-text');
const crosshairH = document.getElementById('crosshair-h');
const crosshairV = document.getElementById('crosshair-v');
const coordinatesDisplay = document.getElementById('coordinates-display');
const annotationsInfo = document.getElementById('annotations-info');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Canvas
    initCanvas();
    
    // 事件监听
    fileInput.addEventListener('change', handleImageUpload);
    classSelector.addEventListener('change', function() {
        currentClass = this.value;
    });
    drawingModeToggle.addEventListener('change', function() {
        isDrawingMode = this.checked;
        if (isDrawingMode) {
            enableRectangleDrawing();
        } else {
            disableRectangleDrawing();
        }
    });
    saveTrainingBtn.addEventListener('click', saveTrainingData);
    deleteRectBtn.addEventListener('click', deleteSelectedRect);
    clearAllBtn.addEventListener('click', clearAllRects);
    startTrainingBtn.addEventListener('click', startTraining);
    
    // 加载训练统计数据
    loadTrainingStats();
});

// 初始化Canvas
function initCanvas() {
    canvas = new fabric.Canvas('canvas', {
        width: 800,
        height: 600,
        selection: true,
        preserveObjectStacking: true
    });
    
    // 监听鼠标移动，更新十字线
    canvas.on('mouse:move', function(options) {
        updateCrosshair(options.pointer);
    });
    
    // 监听鼠标进入/离开画布
    canvas.on('mouse:over', function() {
        if (canvas.backgroundImage) {
            crosshairH.style.display = 'block';
            crosshairV.style.display = 'block';
            coordinatesDisplay.style.display = 'block';
        }
    });
    
    canvas.on('mouse:out', function() {
        crosshairH.style.display = 'none';
        crosshairV.style.display = 'none';
        coordinatesDisplay.style.display = 'none';
    });
    
    // 监听对象选择
    canvas.on('selection:created', updateAnnotationsInfo);
    canvas.on('selection:updated', updateAnnotationsInfo);
    canvas.on('selection:cleared', function() {
        updateAnnotationsInfo();
    });
    
    // 监听对象修改
    canvas.on('object:modified', function(e) {
        if (e.target && e.target.type === 'rect') {
            updateAnnotationsInfo();
        }
    });
}

// 处理图片上传
function handleImageUpload(e) {
    if (!e.target.files.length) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImageWidth = img.width;
            originalImageHeight = img.height;
            
            // 设置Canvas尺寸
            setupCanvas(img);
            
            // 加载图片到Canvas
            loadImageToCanvas(img);
            
            // 隐藏提示文本
            noImageText.style.display = 'none';
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('file', file);
            
            // 显示加载指示器
            const loadingToast = showToast('正在处理图片，请稍候...', 'info', true);
            
            // 发送请求到服务器
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // 移除加载指示器
                document.body.removeChild(loadingToast);
                
                if (data.success) {
                    // 保存当前图片ID
                    currentImageId = data.image_id;
                    
                    // 添加检测到的矩形
                    if (data.rectangles && data.rectangles.length > 0) {
                        addDetectedRectangles(data.rectangles);
                    }
                    
                    showToast('图片处理成功！', 'success');
                } else {
                    showToast(data.error || '处理图片时发生错误', 'error');
                }
            })
            .catch(error => {
                // 移除加载指示器
                document.body.removeChild(loadingToast);
                showToast('上传图片时发生错误: ' + error.message, 'error');
            });
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 设置Canvas尺寸
function setupCanvas(img) {
    const containerWidth = canvasContainer.clientWidth - 20; // 减去一些边距
    
    // 计算缩放比例
    const scale = containerWidth / img.width;
    const canvasWidth = containerWidth;
    const canvasHeight = img.height * scale;
    
    // 设置Canvas尺寸
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // 保存缩放比例
    scaleX = canvasWidth / img.width;
    scaleY = canvasHeight / img.height;
    
    // 设置十字线尺寸
    crosshairH.style.width = canvasWidth + 'px';
    crosshairV.style.height = canvasHeight + 'px';
}

// 加载图片到Canvas
function loadImageToCanvas(img) {
    fabric.Image.fromURL(img.src, function(img) {
        // 设置图片尺寸
        img.scaleToWidth(canvas.width);
        
        // 设置为背景
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            originX: 'left',
            originY: 'top'
        });
        
        // 清空所有矩形
        clearAllRects(false);
        
        // 更新标注信息
        updateAnnotationsInfo();
    });
}

// 启用矩形绘制
function enableRectangleDrawing() {
    // 禁用选择
    canvas.selection = false;
    canvas.forEachObject(function(obj) {
        obj.selectable = false;
    });
    
    // 鼠标按下事件
    canvas.on('mouse:down', function(options) {
        isDrawing = true;
        const pointer = canvas.getPointer(options.e);
        startX = pointer.x;
        startY = pointer.y;
        
        // 创建新矩形
        currentRect = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: getColorForClass(currentClass, 0.3),
            stroke: getColorForClass(currentClass, 0.8),
            strokeWidth: 2,
            selectable: false
        });
        
        // 保存类别信息
        currentRect.data = {
            class: currentClass
        };
        
        canvas.add(currentRect);
    });
    
    // 鼠标移动事件
    canvas.on('mouse:move', function(options) {
        if (!isDrawing) return;
        
        const pointer = canvas.getPointer(options.e);
        
        // 计算宽高
        let width = Math.abs(pointer.x - startX);
        let height = Math.abs(pointer.y - startY);
        
        // 设置矩形位置和尺寸
        if (pointer.x < startX) {
            currentRect.set({ left: pointer.x });
        }
        if (pointer.y < startY) {
            currentRect.set({ top: pointer.y });
        }
        
        currentRect.set({
            width: width,
            height: height
        });
        
        canvas.renderAll();
    });
    
    // 鼠标松开事件
    canvas.on('mouse:up', function() {
        if (!isDrawing) return;
        isDrawing = false;
        
        // 如果矩形太小，则删除
        if (currentRect.width < 5 || currentRect.height < 5) {
            canvas.remove(currentRect);
            canvas.renderAll();
            return;
        }
        
        // 启用选择
        currentRect.selectable = true;
        
        // 添加到矩形列表
        rectangles.push({
            rect: currentRect,
            class: currentClass,
            coords: calculateCoordinates(currentRect)
        });
        
        // 更新标注信息
        updateAnnotationsInfo();
        
        canvas.renderAll();
    });
}

// 禁用矩形绘制
function disableRectangleDrawing() {
    canvas.selection = true;
    canvas.forEachObject(function(obj) {
        obj.selectable = true;
    });
    
    // 移除事件监听
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
}

// 添加检测到的矩形
function addDetectedRectangles(detectedRects) {
    detectedRects.forEach(rectData => {
        const coords = rectData.coords;
        const topLeft = coords.topLeft;
        const bottomRight = coords.bottomRight;
        
        // 计算显示坐标
        const displayLeft = topLeft.x * scaleX;
        const displayTop = topLeft.y * scaleY;
        const displayWidth = (bottomRight.x - topLeft.x) * scaleX;
        const displayHeight = (bottomRight.y - topLeft.y) * scaleY;
        
        // 创建矩形
        const rect = new fabric.Rect({
            left: displayLeft,
            top: displayTop,
            width: displayWidth,
            height: displayHeight,
            fill: getColorForClass(rectData.class, 0.3),
            stroke: getColorForClass(rectData.class, 0.8),
            strokeWidth: 2,
            selectable: true
        });
        
        // 保存类别信息
        rect.data = {
            class: rectData.class
        };
        
        canvas.add(rect);
        
        // 添加到矩形列表
        rectangles.push({
            rect: rect,
            class: rectData.class,
            coords: calculateCoordinates(rect)
        });
    });
    
    canvas.renderAll();
    updateAnnotationsInfo();
}

// 更新十字线位置和坐标显示
function updateCrosshair(pointer) {
    if (!pointer) return;
    
    // 更新十字线位置
    crosshairH.style.top = pointer.y + 'px';
    crosshairV.style.left = pointer.x + 'px';
    
    // 计算原图坐标
    const originalX = Math.round(pointer.x / scaleX);
    const originalY = Math.round(pointer.y / scaleY);
    
    // 更新坐标显示
    coordinatesDisplay.textContent = `X: ${originalX}, Y: ${originalY}`;
    coordinatesDisplay.style.left = (pointer.x + 10) + 'px';
    coordinatesDisplay.style.top = (pointer.y + 10) + 'px';
}

// 计算矩形的原图坐标
function calculateCoordinates(rect) {
    const x_min = Math.round(rect.left / scaleX);
    const y_min = Math.round(rect.top / scaleY);
    const x_max = Math.round((rect.left + rect.width) / scaleX);
    const y_max = Math.round((rect.top + rect.height) / scaleY);
    
    return {
        x_min: x_min,
        y_min: y_min,
        x_max: x_max,
        y_max: y_max
    };
}

// 更新标注信息
function updateAnnotationsInfo() {
    // 获取所有矩形
    const rects = canvas.getObjects('rect');
    
    if (rects.length === 0) {
        annotationsInfo.innerHTML = '<div class="text-base-content/60 italic">暂无标注信息</div>';
        return;
    }
    
    let html = '<div class="overflow-x-auto"><table class="table table-compact w-full">';
    html += '<thead><tr><th>ID</th><th>类别</th><th>坐标 (x_min, y_min, x_max, y_max)</th></tr></thead><tbody>';
    
    rects.forEach((rect, index) => {
        const coords = calculateCoordinates(rect);
        const className = rect.data ? rect.data.class : 'unknown';
        const isSelected = canvas.getActiveObject() === rect;
        
        html += `<tr class="${isSelected ? 'bg-primary/20' : ''}">
            <td>${index + 1}</td>
            <td>${className}</td>
            <td>${coords.x_min}, ${coords.y_min}, ${coords.x_max}, ${coords.y_max}</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    annotationsInfo.innerHTML = html;
}

// 删除选中的矩形
function deleteSelectedRect() {
    const activeObject = canvas.getActiveObject();
    
    if (!activeObject) {
        showToast('请先选择一个矩形', 'warning');
        return;
    }
    
    // 从Canvas中删除
    canvas.remove(activeObject);
    
    // 从矩形列表中删除
    rectangles = rectangles.filter(item => item.rect !== activeObject);
    
    canvas.renderAll();
    updateAnnotationsInfo();
    
    showToast('矩形已删除', 'success');
}

// 清空所有矩形
function clearAllRects(showMessage = true) {
    // 获取所有矩形
    const rects = canvas.getObjects('rect');
    
    if (rects.length === 0 && showMessage) {
        showToast('没有矩形可清除', 'warning');
        return;
    }
    
    // 删除所有矩形
    rects.forEach(rect => {
        canvas.remove(rect);
    });
    
    // 清空矩形列表
    rectangles = [];
    
    canvas.renderAll();
    updateAnnotationsInfo();
    
    if (showMessage) {
        showToast('所有矩形已清除', 'success');
    }
}

// 保存训练数据
function saveTrainingData() {
    if (!currentImageId) {
        showToast('请先上传图片', 'error');
        return;
    }
    
    // 获取所有矩形
    const rects = canvas.getObjects('rect');
    
    if (rects.length === 0) {
        showToast('请先绘制至少一个矩形', 'error');
        return;
    }
    
    // 构建训练数据
    const trainingRectangles = rects.map(rect => {
        const coords = calculateCoordinates(rect);
        const className = rect.data ? rect.data.class : currentClass;
        
        return {
            class: className,
            coords: {
                topLeft: { x: coords.x_min, y: coords.y_min },
                topRight: { x: coords.x_max, y: coords.y_min },
                bottomLeft: { x: coords.x_min, y: coords.y_max },
                bottomRight: { x: coords.x_max, y: coords.y_max }
            }
        };
    });
    
    // 显示加载指示器
    const loadingToast = showToast('正在保存训练数据...', 'info', true);
    
    // 发送数据到服务器
    fetch('/api/training/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image_id: currentImageId,
            rectangles: trainingRectangles
        })
    })
    .then(response => response.json())
    .then(data => {
        // 移除加载指示器
        document.body.removeChild(loadingToast);
        
        if (data.success) {
            showToast('训练数据保存成功！', 'success');
            // 更新训练统计
            loadTrainingStats();
        } else {
            showToast(data.error || '保存失败', 'error');
        }
    })
    .catch(error => {
        // 移除加载指示器
        document.body.removeChild(loadingToast);
        showToast('保存训练数据时发生错误: ' + error.message, 'error');
    });
}

// 加载训练数据统计
function loadTrainingStats() {
    fetch('/api/training/stats')
    .then(response => response.json())
    .then(data => {
        // 更新统计数据
        document.getElementById('training-image-count').textContent = data.image_count;
        document.getElementById('training-label-count').textContent = data.label_count;
        
        // 更新类别分布
        const classDistribution = document.getElementById('class-distribution');
        if (Object.keys(data.class_distribution).length === 0 || 
            Object.values(data.class_distribution).every(val => val === 0)) {
            classDistribution.innerHTML = '<div class="text-base-content/60 italic">暂无数据</div>';
        } else {
            let html = '<div class="overflow-x-auto"><table class="table table-compact w-full">';
            html += '<thead><tr><th>类别</th><th>数量</th></tr></thead><tbody>';
            
            for (const [className, count] of Object.entries(data.class_distribution)) {
                if (count > 0) {
                    html += `<tr><td>${className}</td><td>${count}</td></tr>`;
                }
            }
            
            html += '</tbody></table></div>';
            classDistribution.innerHTML = html;
        }
        
        // 更新训练记录
        const trainingRuns = document.getElementById('training-runs');
        if (data.training_runs.length === 0) {
            trainingRuns.innerHTML = '<div class="text-base-content/60 italic">暂无训练记录</div>';
        } else {
            let html = '<div class="space-y-2">';
            
            data.training_runs.forEach(run => {
                html += `
                <div class="card bg-base-200 shadow-sm">
                    <div class="card-body p-3">
                        <h4 class="card-title text-sm">${run.name}</h4>
                        <div class="flex justify-between items-center">
                            <div class="badge badge-accent">${run.has_best_model ? '有最佳模型' : '无最佳模型'}</div>
                            <button class="btn btn-xs btn-outline" onclick="useModel('${run.best_model_path || run.last_model_path}')">
                                使用此模型
                            </button>
                        </div>
                    </div>
                </div>`;
            });
            
            html += '</div>';
            trainingRuns.innerHTML = html;
        }
    })
    .catch(error => {
        showToast('加载训练数据统计时发生错误: ' + error.message, 'error');
    });
}

// 开始训练模型
function startTraining() {
    // 获取训练参数
    const epochs = parseInt(document.getElementById('training-epochs').value);
    const batchSize = parseInt(document.getElementById('training-batch-size').value);
    const imageSize = parseInt(document.getElementById('training-image-size').value);
    
    // 验证参数
    if (isNaN(epochs) || epochs < 1) {
        showToast('请输入有效的训练轮数', 'error');
        return;
    }
    
    if (isNaN(batchSize) || batchSize < 1) {
        showToast('请输入有效的批次大小', 'error');
        return;
    }
    
    if (isNaN(imageSize) || imageSize < 320) {
        showToast('请输入有效的图像大小', 'error');
        return;
    }
    
    // 显示确认对话框
    if (!confirm(`确定要开始训练模型吗？\n\n训练参数：\n- 训练轮数: ${epochs}\n- 批次大小: ${batchSize}\n- 图像大小: ${imageSize}\n\n训练可能需要一段时间，请确保服务器有足够的资源。`)) {
        return;
    }
    
    // 显示加载指示器
    const loadingToast = showToast('正在开始训练模型...', 'info', true);
    
    // 发送训练请求
    fetch('/api/training/train', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            epochs: epochs,
            batch_size: batchSize,
            image_size: imageSize
        })
    })
    .then(response => response.json())
    .then(data => {
        // 移除加载指示器
        document.body.removeChild(loadingToast);
        
        if (data.success) {
            showToast('模型训练已成功启动！', 'success');
            // 更新训练统计
            loadTrainingStats();
        } else {
            showToast(data.error || '训练失败', 'error');
        }
    })
    .catch(error => {
        // 移除加载指示器
        document.body.removeChild(loadingToast);
        showToast('启动训练时发生错误: ' + error.message, 'error');
    });
}

// 使用指定模型
function useModel(modelPath) {
    if (!modelPath) {
        showToast('模型路径无效', 'error');
        return;
    }
    
    // 显示确认对话框
    if (!confirm(`确定要使用此模型进行预测吗？\n\n模型路径：${modelPath}`)) {
        return;
    }
    
    // 显示加载指示器
    const loadingToast = showToast('正在切换模型...', 'info', true);
    
    // 这里可以添加切换模型的API调用
    // 目前仅显示成功消息
    setTimeout(() => {
        document.body.removeChild(loadingToast);
        showToast('模型已成功切换！', 'success');
    }, 1000);
}

// 获取类别对应的颜色
function getColorForClass(className, alpha = 1) {
    const colors = {
        'text': `rgba(0, 0, 255, ${alpha})`,      // 蓝色
        'title': `rgba(255, 0, 0, ${alpha})`,     // 红色
        'figure': `rgba(0, 255, 0, ${alpha})`,    // 绿色
        'table': `rgba(255, 255, 0, ${alpha})`,   // 黄色
        'list': `rgba(255, 0, 255, ${alpha})`,    // 紫色
        'header': `rgba(0, 255, 255, ${alpha})`,  // 青色
        'footer': `rgba(128, 0, 0, ${alpha})`,    // 深红色
        'formula': `rgba(0, 128, 0, ${alpha})`,   // 深绿色
        'reference': `rgba(0, 0, 128, ${alpha})`, // 深蓝色
        'other': `rgba(128, 128, 128, ${alpha})`  // 灰色
    };
    
    return colors[className.toLowerCase()] || colors['other'];
}

// 显示Toast消息
function showToast(message, type = 'info', persistent = false) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-center';
    
    let alertClass = 'alert-info';
    if (type === 'success') alertClass = 'alert-success';
    if (type === 'error') alertClass = 'alert-error';
    if (type === 'warning') alertClass = 'alert-warning';
    
    let content = `<span>${message}</span>`;
    if (persistent) {
        content = `<span class="loading loading-spinner mr-2"></span><span>${message}</span>`;
    }
    
    toast.innerHTML = `<div class="alert ${alertClass}">${content}</div>`;
    document.body.appendChild(toast);
    
    if (!persistent) {
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
    
    return toast;
}
