import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { ConfirmPaymentService } from '../services/confirm-payment/confirm-payment.service';
import { LoadPurchaseHistoryService } from '../services/load-purchase-history/load-purchase-history.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: ConfirmPaymentService, useValue: {} },
        { provide: LoadPurchaseHistoryService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
