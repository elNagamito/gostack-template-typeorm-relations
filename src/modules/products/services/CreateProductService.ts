import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Product from '../infra/typeorm/entities/Product';
import IProductsRepository from '../repositories/IProductsRepository';

interface IRequest {
  name: string;
  price: number;
  quantity: number;
}

@injectable()
class CreateProductService {
  constructor(
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
  ) {}

  public async execute({ name, price, quantity }: IRequest): Promise<Product> {
    const findDuplicatedProduct = await this.productsRepository.findByName(
      name,
    );

    if (findDuplicatedProduct) {
      throw new AppError('This product already exists in our database');
    }

    const createProduct = await this.productsRepository.create({
      name,
      price,
      quantity,
    });

    return createProduct;
  }
}

export default CreateProductService;
