document.querySelectorAll('#article-container img').forEach(img => {
  img.addEventListener('error', () => {
    if (img.dataset.pomeloError) return;
    img.dataset.pomeloError = 'true';
    img.alt = '图片暂未载入：' + (img.alt || '文章插图');
  });
});
