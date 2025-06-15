

interface OrderSummaryParams {
  cart: any[];
  deliveryTime: string;
  delivery_fee: number;
  info: Record<string, unknown>;
  note: string;
}

export function getOrderSummaryHtml({ cart, deliveryTime, delivery_fee }: OrderSummaryParams) {
  // Calculate subtotal and total for a more complete summary
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + delivery_fee;

  return `
    <div class="order-summary" style="
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 4px 40px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      position: relative;
      border: 1px solid rgba(0, 0, 0, 0.04);
    ">
      <style>
        .order-summary * {
          box-sizing: border-box;
        }
        
        .order-summary .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px 28px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .order-summary .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: shimmer 3s ease-in-out infinite;
        }
        
        .order-summary .header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(30deg); }
        }
        
        .order-summary .content {
          padding: 10px;
        }
        
        .order-summary .info-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .order-summary .info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border-left: 3px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        
        .order-summary .info-item:hover {
          background: #f1f5f9;
          border-left-color: #667eea;
          transform: translateX(2px);
        }
        
        .order-summary .info-icon {
          font-size: 1.2rem;
          opacity: 0.7;
        }
        
        .order-summary .info-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.9rem;
          margin-right: auto;
        }
        
        .order-summary .info-value {
          font-weight: 600;
          color: #1e293b;
        }
        
        .order-summary .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
          margin: 24px 0;
        }
        
        .order-summary .cart-section {
          margin-bottom: 24px;
        }
        
        .order-summary .section-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .order-summary .cart-items {
          space-y: 8px;
        }
        
        .order-summary .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          margin-bottom: 8px;
          transition: background 0.2s ease;
        }
        
        .order-summary .cart-item:hover {
          background: #f1f5f9;
        }
        
        .order-summary .item-name {
          font-weight: 500;
          color: #334155;
        }
        
        .order-summary .item-price {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.95rem;
        }
        
        .order-summary .subtotal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          margin-top: 12px;
          font-weight: 600;
          color: #475569;
          border-top: 1px dashed #e2e8f0;
        }
        
        .order-summary .extra-info {
          margin-bottom: 24px;
        }
        
        .order-summary .extra-info .info-item {
          border-left-color: #f59e0b;
        }
        
        .order-summary .total-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px 24px;
          border-radius: 16px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        
        .order-summary .total-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: slide 2s ease-in-out infinite;
        }
        
        @keyframes slide {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .order-summary .total-label {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }
        
        .order-summary .total-amount {
          font-weight: 700;
          font-size: 1.3rem;
          position: relative;
          z-index: 1;
        }
        
        .order-summary .floating-particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        
        .order-summary .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(102, 126, 234, 0.3);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }
        
        .order-summary .particle:nth-child(1) { left: 10%; animation-delay: 0s; }
        .order-summary .particle:nth-child(2) { left: 80%; animation-delay: 2s; }
        .order-summary .particle:nth-child(3) { left: 45%; animation-delay: 4s; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
      </style>

      <div class="floating-particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
      </div>

      

      <div class="content">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-icon">⏰</span>
            <span class="info-label">Delivery Time</span>
            <span class="info-value">${deliveryTime}</span>
          </div>
          
          <div class="info-item">
            <span class="info-icon">🚚</span>
            <span class="info-label">Delivery Fee</span>
            <span class="info-value">${delivery_fee} TZS</span>
          </div>
          
          
        </div>

       

        <div class="cart-section">
          <div class="section-title">
            <span>🛒</span>
            Cart Items
          </div>
          <div class="cart-items">
            ${cart.map(item => `
              <div class="cart-item">
                <span class="item-name">${item.name} ×${item.quantity}</span>
                <span class="item-price">${item.price * item.quantity} TZS</span>
              </div>
            `).join('')}
          </div>
          <div class="subtotal">
            <span>Subtotal</span>
            <span>${subtotal} TZS</span>
          </div>
        </div>

        

        <div class="total-section">
          <div class="total-label">
            <span>💳</span>
            Total Payment
          </div>
          <div class="total-amount">${total} TZS</div>
        </div>
      </div>
    </div>
  `;
}