import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IOrdersRepository from '../repositories/IOrdersRepository';

import Order from '../infra/typeorm/entities/Order';

interface IFindProducts {
  id: string;
}

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductsInOrder {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // Verifica se o cliente existe no DB
    const findCustomerInDB = await this.customersRepository.findById(
      customer_id,
    );
    if (!findCustomerInDB) {
      throw new AppError('Invalid Customer ID');
    }

    // Verifica se os produtos existem no DB
    const productsID = products.map(product => {
      const productID: IFindProducts = { id: product.id };
      return productID;
    });

    const findProductsInDB = await this.productsRepository.findAllById(
      productsID,
    );

    if (findProductsInDB.length !== productsID.length) {
      throw new AppError('This order contains an invalid product');
    }

    // Lista produtos, quantidades e preços para criação da ordem
    const productsInOrder = products.map(product => {
      const productPrice = findProductsInDB.filter(
        productInDB => productInDB.id === product.id,
      );

      const productInOrder: IProductsInOrder = {
        product_id: product.id,
        price: productPrice[0].price,
        quantity: product.quantity,
      };
      return productInOrder;
    });

    // Calcula quantidades do pedido
    const quantityOfProductsInOrder = products;
    const updateProductQuantities = quantityOfProductsInOrder.map(
      productQuantity => {
        findProductsInDB.filter(productInDB => {
          // Verifica se os produtos solicitados no pedido existem em quantidade suficiente
          if (
            productQuantity.id === productInDB.id &&
            productQuantity.quantity > productInDB.quantity
          ) {
            throw new AppError(
              `Our stock is insufficient for product ${productQuantity.id}`,
            );
          }

          // Subtrai o quantidade do pedido do estoque total
          if (productQuantity.id === productInDB.id) {
            productQuantity.quantity =
              productInDB.quantity - productQuantity.quantity;
          }
          return undefined;
        });

        return productQuantity;
      },
    );

    // Atualiza quantidades no DB
    if (updateProductQuantities) {
      await this.productsRepository.updateQuantity(updateProductQuantities);
    }

    // Cria a ordem
    const createOrder = await this.ordersRepository.create({
      customer: findCustomerInDB,
      products: productsInOrder,
    });

    return createOrder;
  }
}

export default CreateOrderService;
