import React from "react";
import * as THREE from "three";
import * as d3 from "d3";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import mapPoints from "./MapPoints.js";
import "./Earth.css";
import data from "../constants/data.js";

class Earth extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isRotating: true };
    this.meshGroup = null;
  }

  componentDidMount() {
    const box = document.getElementById("box");
    const canvas = document.getElementById("canvas");

    let glRender;
    let camera;
    let earthMesh;
    let scene;
    let controls;

    const globeWidth = 4098 / 2;
    const globeHeight = 1968 / 2;
    const globeRadius = 100;
    const globeSegments = 64;

        // 渲染柱状图颜色和节点
        const colors = [
          "#ffdfe0",
          "#ffc0c0",
          "#FF0000",
          "#ee7070",
          "#c80200",
          "#900000",
          "#510000",
          "#290000"
        ];
        const domain = [1000, 3000, 10000, 50000, 100000, 500000, 1000000, 1000000];

    // 创建渲染器
    glRender = new THREE.WebGLRenderer({ canvas, alpha: true });
    glRender.setSize(canvas.clientWidth, canvas.clientHeight, false);
    // 创建场景
    scene = new THREE.Scene();
    this.meshGroup = new THREE.Group();
    scene.add(this.meshGroup);
    // 创建相机
    const createCamera = () => {
      const fov = 45;
      const aspect = canvas.clientWidth / canvas.clientHeight;
      const near = 1;
      const far = 4000;
      camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      camera.position.z = 400;
    };
    // 创建地球
    const createEarth = () => {
      const geometry = new THREE.SphereGeometry(
        globeRadius,
        globeSegments,
        globeSegments
      );

      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.5,
        color: 0x000000
      });

      earthMesh = new THREE.Mesh(geometry, material);
      this.meshGroup.add(earthMesh);
    };
    // 创建control
    const createControl = () => {
      controls = new OrbitControls(camera, canvas);
      controls.target.set(0, 0, 0);
    };

    createCamera();
    createEarth();
    createControl();

    // 将平面二维点转化为三维
    const convertFlatCoordsToSphereCoords = (x, y) => {
      let latitude = ((x - globeWidth) / globeWidth) * -180;
      let longitude = ((y - globeHeight) / globeHeight) * -90;
      latitude = (latitude * Math.PI) / 180;
      longitude = (longitude * Math.PI) / 180;
      const radius = Math.cos(longitude) * globeRadius;
      const dx = Math.cos(latitude) * radius;
      const dy = Math.sin(longitude) * globeRadius;
      const dz = Math.sin(latitude) * radius;
      return { dx, dy, dz };
    };
    // 给圆球上铺点
    const createMapPoints = () => {
      const material = new THREE.MeshBasicMaterial({ color: "#f5f5f5" });
      const sphereGeometries = [];
    
      mapPoints.points.forEach(point => {
        const pos = convertFlatCoordsToSphereCoords(point.x, point.y);
        if (pos.dx && pos.dy && pos.dz) {
          const pingGeometry = new THREE.SphereGeometry(0.4, 5, 5);
          pingGeometry.translate(pos.dx, pos.dy, pos.dz);
          sphereGeometries.push(pingGeometry);
        }
      });
    
      const earthMapPoints = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(sphereGeometries), // Updated method name
        material
      );
      this.meshGroup.add(earthMapPoints);
    };
    
    // 经纬度转化为球坐标
    const convertLatLngToSphereCoords = (latitude, longitude, radius) => {
      const phi = (latitude * Math.PI) / 180;
      const theta = ((longitude - 180) * Math.PI) / 180;
      const dx = -(radius - 1) * Math.cos(phi) * Math.cos(theta);
      const dy = (radius - 1) * Math.sin(phi);
      const dz = (radius - 1) * Math.cos(phi) * Math.sin(theta);
      return { dx, dy, dz };
    };

// 创建柱状图
// 将函数声明转换为箭头函数
const createBar = () => {
  if (!data || data.length === 0) return;

  // 根据数据值定义一个颜色比例尺
  const scale = d3.scaleLinear().domain(domain).range(colors);

  data.forEach(({ lat, lng, value: size }) => {
    const color = scale(size);
    const pos = convertLatLngToSphereCoords(lat, lng, globeRadius);
    if (pos.dx && pos.dy && pos.dz) {
      // 创建柱状的几何体
      const geometry = new THREE.BoxGeometry(2, 2, 1);
      // 将几何体向下移动，使其底部与球面接触
      geometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(0, 0, -0.5)
      );

      // 创建材质并应用颜色
      const barMesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color })
      );
      // 设置柱状图的位置
      barMesh.position.set(pos.dx, pos.dy, pos.dz);
      // 让柱状图始终面向地球中心
      barMesh.lookAt(earthMesh.position);

      // 根据数据大小调整柱状图的高度
      barMesh.scale.z = Math.max(size / 60000, 0.1); // 根据需要替换60000这个比例因子
      barMesh.updateMatrix();

      // 使用 this.meshGroup 添加到场景中
      this.meshGroup.add(barMesh);
    }
  });
};

    // 创建点阵图
    createMapPoints();
    // 创建柱状统计图
    createBar(); 

    // 动画
    const animate = () => {
      requestAnimationFrame(animate);
      glRender.render(scene, camera);
      controls.update();
      if (this.state.isRotating) {
        this.meshGroup.rotateY(0.004);
      }
    };

    animate();
  }

  toggleRotation = () => {
    this.setState(state => ({ isRotating: !state.isRotating }));
  };

  render() {
    return (
      <div id="box" style={{ width: "100vw", height: "100vh" }}>
        <canvas id="canvas" style={{ width: "100%", height: "100%" }}></canvas>
        <button onClick={this.toggleRotation} style={{ position: "absolute", top: "10px", left: "10px" }}>
          {this.state.isRotating ? 'Stop Rotation' : 'Start Rotation'}
        </button>
      </div>
    );
  }
}

export default Earth;
