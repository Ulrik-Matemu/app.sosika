import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";

export const Cart = ({ cart }) => {
    return (
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-200">Cart</h2>
        {cart.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">Your cart is empty.</p>
        ) : (
          <ul>
            {cart.map((item: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; quantity: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; price: number; }) => (
              <li key={item.id} className="flex justify-between items-center border-b py-2">
                <span className="text-gray-900 dark:text-gray-200">
                  {item.name} (x{item.quantity})
                </span>
                <span className="text-gray-700 dark:text-gray-400">${(Number(item.quantity) * item.price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };