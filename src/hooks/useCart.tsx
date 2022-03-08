import { stringify } from 'querystring';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const CART_ITEM_NAME = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_ITEM_NAME);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productOnCart = updatedCart.find(product => product.id === productId);
      const stock = (await api.get(`stock/${productId}`)).data;
      const stockAmount = stock.amount;

      if (stockAmount < 1)
        toast.error('Requested quantity out of stock');


      if (productOnCart) {
        productOnCart.amount += 1;
      }
      else {
        const product = (await api.get(`products/${productId}`)).data;

        if (!product) {
          toast.error('Product not found');
          return;
        }

        const newProduct = {
          ...product,
          amount: 1
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem(CART_ITEM_NAME, JSON.stringify(updatedCart));
    } catch {
      toast.error('Error when trying to add the product');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartWithoutProduct = cart.filter(p => p.id != productId);
      setCart(cartWithoutProduct);
    } catch {
      toast.error('Error when removing the product');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];
      console.log('product:', updatedCart);
      const product = updatedCart.find(p => p.id === productId);
      console.log('d', product?.id)
      if (!product || product.amount <= 0)
        return;

      product.amount = + amount;
      setCart(updatedCart);
      localStorage.setItem(CART_ITEM_NAME, JSON.stringify(updatedCart));
    } catch {
      // TODO
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
