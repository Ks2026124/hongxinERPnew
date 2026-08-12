import crypto from 'crypto';
import sharp from 'sharp';

/**
 * 计算图片的 SHA-256 哈希值
 * @param buffer 图片文件的 Buffer
 * @returns SHA-256 哈希字符串（hex 格式）
 */
export function computeSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * 计算图片的感知哈希（pHash）
 * 使用 DCT（离散余弦变换）算法
 * @param buffer 图片文件的 Buffer
 * @returns 64 位的 pHash 字符串（hex 格式，16 个字符）
 */
export async function computePHash(buffer: Buffer): Promise<string> {
  // 1. 将图片缩小到 32x32 灰度图
  const size = 32;
  const { data, info } = await sharp(buffer)
    .resize(size, size, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. 提取灰度值矩阵
  const pixels: number[][] = [];
  for (let y = 0; y < size; y++) {
    pixels[y] = [];
    for (let x = 0; x < size; x++) {
      pixels[y][x] = data[y * size + x];
    }
  }

  // 3. 对每一行进行 DCT
  const dctRows: number[][] = [];
  for (let y = 0; y < size; y++) {
    dctRows[y] = dct1D(pixels[y]);
  }

  // 4. 对每一列进行 DCT（完成 2D DCT）
  const dctMatrix: number[][] = [];
  for (let y = 0; y < size; y++) {
    dctMatrix[y] = new Array(size).fill(0);
  }
  for (let x = 0; x < size; x++) {
    const col: number[] = [];
    for (let y = 0; y < size; y++) {
      col.push(dctRows[y][x]);
    }
    const dctCol = dct1D(col);
    for (let y = 0; y < size; y++) {
      dctMatrix[y][x] = dctCol[y];
    }
  }

  // 5. 取左上角 8x8 的低频分量
  const lowFreq: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      lowFreq.push(dctMatrix[y][x]);
    }
  }

  // 6. 计算平均值（排除 DC 分量）
  const dc = lowFreq[0];
  const acValues = lowFreq.slice(1);
  const avg = acValues.reduce((sum, v) => sum + v, 0) / acValues.length;

  // 7. 生成 64 位哈希（使用字符串避免 BigInt 兼容性问题）
  let hashBits = '';
  for (let i = 0; i < 64; i++) {
    hashBits += lowFreq[i] > avg ? '1' : '0';
  }

  // 转为 16 位 hex 字符串
  let hexStr = '';
  for (let i = 0; i < 64; i += 4) {
    const chunk = hashBits.substring(i, i + 4);
    hexStr += parseInt(chunk, 2).toString(16);
  }
  return hexStr;
}

/**
 * 一维 DCT（离散余弦变换）
 */
function dct1D(signal: number[]): number[] {
  const N = signal.length;
  const result: number[] = [];
  
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += signal[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    }
    result.push(sum);
  }
  
  return result;
}

/**
 * 计算两个 pHash 之间的汉明距离
 * @param hash1 第一个 pHash（hex 字符串）
 * @param hash2 第二个 pHash（hex 字符串）
 * @returns 汉明距离（0-64）
 */
export function hammingDistance(hash1: string, hash2: string): number {
  // 将 hex 字符串转为二进制字符串
  let bits1 = '';
  let bits2 = '';
  for (let i = 0; i < hash1.length; i++) {
    bits1 += parseInt(hash1[i], 16).toString(2).padStart(4, '0');
    bits2 += parseInt(hash2[i], 16).toString(2).padStart(4, '0');
  }
  
  let distance = 0;
  for (let i = 0; i < bits1.length; i++) {
    if (bits1[i] !== bits2[i]) {
      distance++;
    }
  }
  
  return distance;
}

/**
 * 判断两个 pHash 是否相似
 * 汉明距离 <= 10 认为是高度相似
 * @param hash1 第一个 pHash
 * @param hash2 第二个 pHash
 * @returns 是否相似
 */
export function isSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
