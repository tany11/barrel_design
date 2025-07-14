// ====================================
// ダーツバレル設計ツール - メインスクリプト
// ====================================

// グローバル変数
let scene, camera, renderer, barrel, controls;
let currentGripType = 'straight';
let currentMaterial = 'tungsten';
let viewMode = '3d';
let canvas2d, ctx2d;

// 材質設定
const materials = {
    tungsten: { color: 0x8C7853, metalness: 0.9, roughness: 0.1 },
    brass: { color: 0xB5A642, metalness: 0.8, roughness: 0.2 },
    titanium: { color: 0xC0C0C0, metalness: 0.7, roughness: 0.3 }
};

// ====================================
// 初期化関数
// ====================================
function init() {
    // シーン設定
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // カメラ設定
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);
    
    // レンダラー設定
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);
    
    // ライト設定
    setupLights();
    
    // 初期バレル作成
    createBarrel();
    
    // 2Dキャンバス初期化
    initCanvas2D();
    
    // コントロール設定
    setupControls();
    
    // 初期表示モード設定
    setViewMode('3d');
    
    // アニメーション開始
    animate();
}

// ====================================
// ライト設定
// ====================================
function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(-10, 0, 10);
    scene.add(pointLight);
}

// ====================================
// 2Dキャンバス初期化
// ====================================
function initCanvas2D() {
    canvas2d = document.getElementById('canvas2d');
    ctx2d = canvas2d.getContext('2d');
    canvas2d.width = window.innerWidth;
    canvas2d.height = window.innerHeight;
}

// ====================================
// 3Dバレル作成
// ====================================
function createBarrel() {
    // 既存のバレルを削除
    if (barrel) {
        scene.remove(barrel);
    }
    
    barrel = new THREE.Group();
    
    const length = parseFloat(document.getElementById('length').value);
    const diameter = parseFloat(document.getElementById('diameter').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // メイン材質
    const matProps = materials[currentMaterial];
    const material = new THREE.MeshPhysicalMaterial({
        color: matProps.color,
        metalness: matProps.metalness,
        roughness: matProps.roughness,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
    });
    
    // バレル形状作成
    const barrelGeometry = createBarrelGeometry(length, diameter);
    const barrelMesh = new THREE.Mesh(barrelGeometry, material);
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    barrel.add(barrelMesh);
    
    // グリップパターン追加
    addGripPattern(barrel, length, diameter);
    
    // ネジ部分
    const threadGeometry = new THREE.CylinderGeometry(diameter/2 - 0.2, diameter/2 - 0.2, 3, 16);
    const threadMaterial = new THREE.MeshPhysicalMaterial({ color: 0x333333, metalness: 0.8 });
    const threadMesh = new THREE.Mesh(threadGeometry, threadMaterial);
    threadMesh.position.x = length/2 + 1.5;
    threadMesh.rotation.z = Math.PI/2;
    barrel.add(threadMesh);
    
    // 先端部分
    const tipGeometry = new THREE.ConeGeometry(diameter/2 - 0.3, 2, 8);
    const tipMesh = new THREE.Mesh(tipGeometry, material);
    tipMesh.position.x = -length/2 - 1;
    tipMesh.rotation.z = -Math.PI/2;
    barrel.add(tipMesh);
    
    scene.add(barrel);
}

// ====================================
// バレル形状作成
// ====================================
function createBarrelGeometry(length, diameter) {
    const segments = 32;
    let geometry;
    
    switch(currentGripType) {
        case 'torpedo':
            // トーピード形状（中央が太い）
            const points = [];
            for(let i = 0; i <= segments; i++) {
                const x = (i / segments - 0.5) * length;
                const factor = 1 + 0.3 * Math.sin(Math.PI * i / segments);
                const radius = diameter/2 * factor;
                points.push(new THREE.Vector2(radius, x));
            }
            geometry = new THREE.LatheGeometry(points, 24);
            break;
            
        case 'scallop':
            // スカロップ形状（波打つ）
            geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, length, 24);
            break;
            
        default: // straight
            geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, length, 24);
    }
    
    geometry.rotateZ(Math.PI/2);
    return geometry;
}

// ====================================
// グリップパターン追加
// ====================================
function addGripPattern(parent, length, diameter) {
    const ringMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.3
    });
    
    // グリップリング
    for(let i = 0; i < 8; i++) {
        const ringGeometry = new THREE.TorusGeometry(diameter/2 + 0.1, 0.15, 8, 16);
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.x = -length/4 + (i * length/16);
        ringMesh.rotation.y = Math.PI/2;
        parent.add(ringMesh);
    }
    
    // カット模様
    if(currentGripType === 'scallop') {
        for(let i = 0; i < 16; i++) {
            const cutGeometry = new THREE.BoxGeometry(0.3, 0.3, length * 0.8);
            const cutMaterial = new THREE.MeshPhysicalMaterial({ color: 0x666666 });
            const cutMesh = new THREE.Mesh(cutGeometry, cutMaterial);
            cutMesh.position.x = 0;
            cutMesh.position.y = (diameter/2 + 0.2) * Math.cos(i * Math.PI / 8);
            cutMesh.position.z = (diameter/2 + 0.2) * Math.sin(i * Math.PI / 8);
            parent.add(cutMesh);
        }
    }
}

// ====================================
// コントロール設定
// ====================================
function setupControls() {
    const lengthSlider = document.getElementById('length');
    const diameterSlider = document.getElementById('diameter');
    const weightSlider = document.getElementById('weight');
    
    lengthSlider.addEventListener('input', function() {
        document.getElementById('lengthValue').textContent = this.value + 'mm';
        document.getElementById('specLength').textContent = this.value + 'mm';
        createBarrel();
        if(viewMode === '2d') draw2D();
    });
    
    diameterSlider.addEventListener('input', function() {
        document.getElementById('diameterValue').textContent = this.value + 'mm';
        document.getElementById('specDiameter').textContent = this.value + 'mm';
        createBarrel();
        if(viewMode === '2d') draw2D();
    });
    
    weightSlider.addEventListener('input', function() {
        document.getElementById('weightValue').textContent = this.value + 'g';
        document.getElementById('specWeight').textContent = this.value + 'g';
        if(viewMode === '2d') draw2D();
    });
}

// ====================================
// 設定変更関数
// ====================================
function setGripType(type) {
    currentGripType = type;
    document.getElementById('specGrip').textContent = 
        type === 'straight' ? 'ストレート' :
        type === 'torpedo' ? 'トーピード' : 'スカロップ';
    createBarrel();
    if(viewMode === '2d') draw2D();
}

function setMaterial(material) {
    currentMaterial = material;
    document.getElementById('specMaterial').textContent = 
        material === 'tungsten' ? 'タングステン' :
        material === 'brass' ? 'ブラス' : 'チタン';
    createBarrel();
    if(viewMode === '2d') draw2D();
}

function setViewMode(mode) {
    viewMode = mode;
    
    // ボタンの状態更新
    document.getElementById('btn3d').className = mode === '3d' ? 'active' : '';
    document.getElementById('btn2d').className = mode === '2d' ? 'active' : '';
    
    if(mode === '3d') {
        document.getElementById('container').style.display = 'block';
        canvas2d.style.display = 'none';
    } else {
        document.getElementById('container').style.display = 'none';
        canvas2d.style.display = 'block';
        draw2D();
    }
}

// ====================================
// 2D図面描画
// ====================================
function draw2D() {
    ctx2d.clearRect(0, 0, canvas2d.width, canvas2d.height);
    
    const length = parseFloat(document.getElementById('length').value);
    const diameter = parseFloat(document.getElementById('diameter').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // 描画スケール設定
    const scale = 8;
    const centerX = canvas2d.width / 2;
    const centerY = canvas2d.height / 2;
    
    // 背景グリッド
    drawGrid(ctx2d, centerX, centerY, scale);
    
    // 側面図
    drawSideView(ctx2d, centerX, centerY - 100, length, diameter, scale);
    
    // 正面図
    drawFrontView(ctx2d, centerX, centerY + 150, diameter, scale);
    
    // 寸法線
    drawDimensions(ctx2d, centerX, centerY - 100, length, diameter, scale);
    
    // タイトル
    ctx2d.fillStyle = '#333';
    ctx2d.font = 'bold 24px Arial';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('ダーツバレル設計図', centerX, 50);
    
    // 仕様表
    drawSpecifications(ctx2d, 50, 100, length, diameter, weight);
}

// ====================================
// 2D描画ヘルパー関数
// ====================================
function drawGrid(ctx, centerX, centerY, scale) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // 縦線
    for(let x = 0; x < canvas2d.width; x += scale * 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas2d.height);
        ctx.stroke();
    }
    
    // 横線
    for(let y = 0; y < canvas2d.height; y += scale * 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas2d.width, y);
        ctx.stroke();
    }
}

function drawSideView(ctx, centerX, centerY, length, diameter, scale) {
    const barrelLength = length * scale;
    const barrelDiameter = diameter * scale;
    
    // 中心線
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - barrelLength/2 - 20, centerY);
    ctx.lineTo(centerX + barrelLength/2 + 20, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // メインバレル
    ctx.fillStyle = materials[currentMaterial].color === 0x8C7853 ? '#8C7853' : 
                   materials[currentMaterial].color === 0xB5A642 ? '#B5A642' : '#C0C0C0';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    if(currentGripType === 'torpedo') {
        // トーピード形状
        ctx.beginPath();
        ctx.moveTo(centerX - barrelLength/2, centerY - barrelDiameter/2);
        ctx.quadraticCurveTo(centerX - barrelLength/4, centerY - barrelDiameter/2 * 1.3,
                           centerX, centerY - barrelDiameter/2 * 1.3);
        ctx.quadraticCurveTo(centerX + barrelLength/4, centerY - barrelDiameter/2 * 1.3,
                           centerX + barrelLength/2, centerY - barrelDiameter/2);
        ctx.lineTo(centerX + barrelLength/2, centerY + barrelDiameter/2);
        ctx.quadraticCurveTo(centerX + barrelLength/4, centerY + barrelDiameter/2 * 1.3,
                           centerX, centerY + barrelDiameter/2 * 1.3);
        ctx.quadraticCurveTo(centerX - barrelLength/4, centerY + barrelDiameter/2 * 1.3,
                           centerX - barrelLength/2, centerY + barrelDiameter/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else {
        // ストレート/スカロップ形状
        ctx.fillRect(centerX - barrelLength/2, centerY - barrelDiameter/2,
                   barrelLength, barrelDiameter);
        ctx.strokeRect(centerX - barrelLength/2, centerY - barrelDiameter/2,
                     barrelLength, barrelDiameter);
    }
    
    // グリップパターン
    if(currentGripType === 'scallop') {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        for(let i = 0; i < 12; i++) {
            const x = centerX - barrelLength/3 + (i * barrelLength/18);
            ctx.beginPath();
            ctx.moveTo(x, centerY - barrelDiameter/2);
            ctx.lineTo(x, centerY + barrelDiameter/2);
            ctx.stroke();
        }
    }
    
    // リング
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    for(let i = 0; i < 8; i++) {
        const x = centerX - barrelLength/4 + (i * barrelLength/16);
        ctx.beginPath();
        ctx.moveTo(x, centerY - barrelDiameter/2 - 2);
        ctx.lineTo(x, centerY + barrelDiameter/2 + 2);
        ctx.stroke();
    }
    
    // ネジ部分
    ctx.fillStyle = '#333';
    ctx.fillRect(centerX + barrelLength/2, centerY - barrelDiameter/2 + 2,
                scale * 3, barrelDiameter - 4);
    ctx.strokeRect(centerX + barrelLength/2, centerY - barrelDiameter/2 + 2,
                  scale * 3, barrelDiameter - 4);
    
    // 先端部分
    ctx.beginPath();
    ctx.moveTo(centerX - barrelLength/2, centerY - barrelDiameter/2 + 3);
    ctx.lineTo(centerX - barrelLength/2 - scale * 2, centerY);
    ctx.lineTo(centerX - barrelLength/2, centerY + barrelDiameter/2 - 3);
    ctx.fill();
    ctx.stroke();
}

function drawFrontView(ctx, centerX, centerY, diameter, scale) {
    const radius = diameter * scale / 2;
    
    // 円形断面
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 中心線
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 10, centerY);
    ctx.lineTo(centerX + radius + 10, centerY);
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX, centerY + radius + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // グリップパターン（正面から見た様子）
    if(currentGripType === 'scallop') {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        for(let i = 0; i < 16; i++) {
            const angle = (i * Math.PI * 2) / 16;
            const x1 = centerX + Math.cos(angle) * radius * 0.8;
            const y1 = centerY + Math.sin(angle) * radius * 0.8;
            const x2 = centerX + Math.cos(angle) * radius * 1.1;
            const y2 = centerY + Math.sin(angle) * radius * 1.1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    // ラベル
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('正面図', centerX, centerY + radius + 30);
}

function drawDimensions(ctx, centerX, centerY, length, diameter, scale) {
    const barrelLength = length * scale;
    const barrelDiameter = diameter * scale;
    
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // 長さ寸法
    const dimY = centerY + barrelDiameter/2 + 30;
    ctx.beginPath();
    ctx.moveTo(centerX - barrelLength/2, dimY);
    ctx.lineTo(centerX + barrelLength/2, dimY);
    ctx.stroke();
    
    // 寸法線の矢印
    drawArrow(ctx, centerX - barrelLength/2, dimY, -5, 0);
    drawArrow(ctx, centerX + barrelLength/2, dimY, 5, 0);
    
    // 寸法値
    ctx.fillText(length + 'mm', centerX, dimY - 5);
    
    // 直径寸法
    const dimX = centerX + barrelLength/2 + 40;
    ctx.beginPath();
    ctx.moveTo(dimX, centerY - barrelDiameter/2);
    ctx.lineTo(dimX, centerY + barrelDiameter/2);
    ctx.stroke();
    
    drawArrow(ctx, dimX, centerY - barrelDiameter/2, 0, -5);
    drawArrow(ctx, dimX, centerY + barrelDiameter/2, 0, 5);
    
    ctx.textAlign = 'left';
    ctx.fillText('φ' + diameter + 'mm', dimX + 10, centerY);
}

function drawArrow(ctx, x, y, dx, dy) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(x + dx/2, y + dy/2 + 2);
    ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(x + dx/2, y + dy/2 - 2);
    ctx.stroke();
}

function drawSpecifications(ctx, x, y, length, diameter, weight) {
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillText('仕様', x, y);
    ctx.font = '14px Arial';
    ctx.fillText(`全長: ${length}mm`, x, y + 25);
    ctx.fillText(`直径: φ${diameter}mm`, x, y + 45);
    ctx.fillText(`重量: ${weight}g`, x, y + 65);
    ctx.fillText(`材質: ${currentMaterial === 'tungsten' ? 'タングステン' :
                          currentMaterial === 'brass' ? 'ブラス' : 'チタン'}`, x, y + 85);
    ctx.fillText(`グリップ: ${currentGripType === 'straight' ? 'ストレート' :
                            currentGripType === 'torpedo' ? 'トーピード' : 'スカロップ'}`, x, y + 105);
    
    // 公差表記
    ctx.fillText('公差: ±0.1mm', x, y + 130);
}

// ====================================
// アニメーション
// ====================================
function animate() {
    if(viewMode === '3d') {
        requestAnimationFrame(animate);
        
        // バレルを回転
        if(barrel) {
            barrel.rotation.y += 0.005;
            barrel.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        }
        
        renderer.render(scene, camera);
    } else {
        // 2Dモードでは描画を一度だけ実行
        requestAnimationFrame(animate);
    }
}

// ====================================
// イベントリスナー
// ====================================
// ウィンドウリサイズ対応
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    canvas2d.width = window.innerWidth;
    canvas2d.height = window.innerHeight;
    if(viewMode === '2d') draw2D();
});

// ====================================
// 初期化実行
// ====================================
// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', function() {
    init();
});