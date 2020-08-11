import { getRepository, Repository } from 'typeorm';
import { classToPlain, plainToClass } from 'class-transformer';
import { v4 as uuidV4 } from 'uuid';
import IOrdersRepository from '@modules/orders/repositories/IOrdersRepository';
import ICreateOrderDTO from '@modules/orders/dtos/ICreateOrderDTO';
import Order from '../entities/Order';
import OrdersProducts from '../entities/OrdersProducts';

class OrdersRepository implements IOrdersRepository {
  private ordersRepository: Repository<Order>;

  private ordersProductsRepository: Repository<OrdersProducts>;

  constructor() {
    this.ordersRepository = getRepository(Order);
    this.ordersProductsRepository = getRepository(OrdersProducts);
  }

  public async create({ customer, products }: ICreateOrderDTO): Promise<Order> {
    const order = new Order();
    order.customer = customer;

    order.id = uuidV4();
    const order_products = products.map(product =>
      this.ordersProductsRepository.create({
        order_id: order.id,
        price: product.price,
        product_id: product.product_id,
        quantity: product.quantity,
      }),
    );

    order.order_products = order_products;

    await this.ordersRepository.save(order);
    // await this.orderProductRepository.save(products);

    const plainOrder = classToPlain(order);
    const parsedOrder = plainToClass(Order, plainOrder);
    return parsedOrder;
  }

  public async findById(id: string): Promise<Order | undefined> {
    const findOrder = await this.ordersRepository.findOne(id, {
      relations: ['customer', 'order_products'],
    });

    return findOrder;
  }
}

export default OrdersRepository;
