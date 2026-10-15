import { execSync } from 'child_process';

const customMsg = process.argv.slice(2).join(' ').trim();
const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
const commitMessage = customMsg ? customMsg : `chore: auto update ${nowStr}`;

try {
  console.log('📦 Menambahkan semua berkas perubahan (git add -A)...');
  execSync('git add -A', { stdio: 'inherit' });

  // Cek apakah ada perubahan yang perlu di-commit
  const status = execSync('git status --porcelain').toString().trim();
  if (!status) {
    console.log('ℹ️ Tidak ada perubahan berkas untuk di-commit.');
    process.exit(0);
  }

  console.log(`📝 Melakukan commit dengan pesan: "${commitMessage}"...`);
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

  console.log('🚀 Mengunggah (git push) ke GitHub...');
  execSync('git push', { stdio: 'inherit' });

  console.log('✅ Selesai! Semua perubahan telah berhasil di-commit dan di-push ke GitHub.');
} catch (error) {
  console.error('❌ Gagal melakukan auto-commit / push:', error.message);
  process.exit(1);
}
