import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
      let stockAmount = stock.amount - 1;
      let isProductNewOnCart = true;

      if(productOnCart) {
        stockAmount = stockAmount - productOnCart.amount;
        isProductNewOnCart = false;
      }
      if(stockAmount < 0){
        console.log('entro')
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productOnCart && !isProductNewOnCart)
        productOnCart.amount++;

      if (isProductNewOnCart) {
        const product = (await api.get(`products/${productId}`)).data;

        if (!product) {
          toast.error('Producto não encontrado');
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
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const doesProductExists = cart.some(p => p.id == productId);

      if(!doesProductExists)
        throw 'error'

      const cartWithoutProduct = cart.filter(p => p.id != productId);
      setCart(cartWithoutProduct);
      localStorage.setItem(CART_ITEM_NAME, JSON.stringify(cartWithoutProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = (await api.get(`stock/${productId}`)).data;
      const productOnCart = cart.find(p => p.id == productId);
      const isDecreasingProductAmount = productOnCart && (amount < productOnCart.amount);
      
      if(!isDecreasingProductAmount) {
        const stockAmountAfterUpdate = stock.amount - amount;
  
        if (stockAmountAfterUpdate < 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return; 
        }
      }
        
      const updatedCart = [...cart];
      const product = updatedCart.find(p => p.id === productId);

      if (!product || amount <= 0)
        return;

      product.amount = + amount;
      setCart(updatedCart);
      localStorage.setItem(CART_ITEM_NAME, JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
