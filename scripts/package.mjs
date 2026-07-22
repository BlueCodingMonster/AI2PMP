import fs from 'fs';
import path from 'path';

const srcDir = process.cwd();
const distDir = path.join(srcDir, 'dist');

console.log('开始打包 (方案 B)...');

// 1. 清理并创建 dist 目录
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Helper to copy directory if exists
function copyDir(src, dest) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`复制成功: ${path.relative(srcDir, src)} -> ${path.relative(srcDir, dest)}`);
  } else {
    console.warn(`未找到源目录: ${path.relative(srcDir, src)}`);
  }
}

// 2. 复制 standalone 中的内容
const standaloneDir = path.join(srcDir, '.next', 'standalone');
if (!fs.existsSync(standaloneDir)) {
  console.error('错误: 未找到 .next/standalone 目录。请先运行 npm run build 进行构建！');
  process.exit(1);
}
// standalone 下的文件和文件夹全部拷贝到 dist 根目录
fs.readdirSync(standaloneDir).forEach(file => {
  const srcPath = path.join(standaloneDir, file);
  const destPath = path.join(distDir, file);
  fs.cpSync(srcPath, destPath, { recursive: true });
});
console.log('复制成功: .next/standalone 中的运行依赖');

// 3. 复制 public 目录
copyDir(path.join(srcDir, 'public'), path.join(distDir, 'public'));

// 4. 复制 .next/static 目录
copyDir(path.join(srcDir, '.next', 'static'), path.join(distDir, '.next', 'static'));

// 5. 复制 prisma 目录
copyDir(path.join(srcDir, 'prisma'), path.join(distDir, 'prisma'));

// 6. 复制 .env.example 供配置参考
const envExample = path.join(srcDir, '.env.example');
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(distDir, '.env.example'));
  console.log('复制成功: .env.example');
}

// 7. 在 dist 中生成简易的启动脚本及说明文档
const readmeContent = `# AI2PMP 部署包说明

这是一个基于 Next.js 独立运行模式（Standalone）编译的生产环境部署包。

## 部署运行步骤

1. **环境准备**
   - 目标 PC 需安装 Node.js (推荐 v20.x 或更高版本)。

2. **配置环境变量**
   - 在本目录下创建 \`.env\` 文件，内容参考 \`.env.example\`，配置您的数据库连接地址和 NextAuth 密钥。

3. **初始化数据库客户端**
   - 打开终端运行以下命令生成本地数据库客户端模块：
     \`\`\`bash
     npx prisma generate
     \`\`\`

4. **启动服务 (PM2)**
   - 全局安装 pm2: \`npm install -g pm2\`
   - 启动服务: \`pm2 start server.js --name "ai2pmp"\`

5. **本地启动 (测试时使用)**
   - \`node server.js\` (默认端口 3000)
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent, 'utf-8');
console.log('生成成功: README.md');

// 写入简易的 Windows 启动批处理脚本 start.bat
const startBatContent = `@echo off
echo Running Prisma Generate...
call npx prisma generate
echo Starting Server via PM2...
call pm2 start server.js --name "ai2pmp"
pause
`;
fs.writeFileSync(path.join(distDir, 'start.bat'), startBatContent, 'utf-8');
console.log('生成成功: start.bat');

console.log('\n打包完成！打包成果物位于项目根目录的 dist 文件夹中。');
console.log('您可以将 dist 文件夹整体压缩为 ZIP，然后传输到目标 PC 部署。');
