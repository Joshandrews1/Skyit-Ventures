import { Product } from '../types';

export const mockProducts: Product[] = [];

export const getProducts = () => mockProducts;

export const getProductById = (id: string) => mockProducts.find(p => p.id === id);
