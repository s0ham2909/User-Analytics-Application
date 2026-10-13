/**
 * Acme Store - Shared Cart Manager
 * Persists cart items in localStorage under the key 'cart'.
 */
(function () {
  var CART_KEY = 'cart';

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
    updateCartBadge();
  }

  function addToCart(product) {
    var cart = getCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === product.id) {
        existing = cart[i];
        break;
      }
    }
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        thumb: product.thumb || '📦',
        quantity: 1,
      });
    }
    saveCart(cart);
  }

  function updateQuantity(id, delta) {
    var cart = getCart();
    var updated = [];
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      if (item.id === id) {
        item.quantity += delta;
        if (item.quantity > 0) {
          updated.push(item);
        }
      } else {
        updated.push(item);
      }
    }
    saveCart(updated);
  }

  function removeFromCart(id) {
    var cart = getCart();
    var updated = cart.filter(function (item) {
      return item.id !== id;
    });
    saveCart(updated);
  }

  function clearCart() {
    try {
      localStorage.removeItem(CART_KEY);
    } catch (e) {}
    updateCartBadge();
  }

  function getCartCount() {
    var cart = getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
      count += cart[i].quantity || 0;
    }
    return count;
  }

  function getCartTotal() {
    var cart = getCart();
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += (cart[i].price || 0) * (cart[i].quantity || 0);
    }
    return total;
  }

  function updateCartBadge() {
    var count = getCartCount();
    var badges = document.querySelectorAll('.cart-badge');
    badges.forEach(function (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  // Expose globally to window.Cart
  window.Cart = {
    getCart: getCart,
    saveCart: saveCart,
    addToCart: addToCart,
    updateQuantity: updateQuantity,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    getCartCount: getCartCount,
    getCartTotal: getCartTotal,
    updateCartBadge: updateCartBadge,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartBadge);
  } else {
    updateCartBadge();
  }
})();
