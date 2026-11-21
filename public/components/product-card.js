export function renderProductCard(product) {
  return `
    <article class="product-card">
      <span class="product-tag">${product.tag}</span>
      <div class="product-image">${product.emoji}</div>
      <h3>${product.name}</h3><div class="product-meta">${product.detail}</div>
      <div class="product-bottom"><span class="price">₹${product.price.toLocaleString("en-IN")}</span><button class="add-btn" data-add="${product.id}">+ Add</button></div>
    </article>`;
}
