import { WalletCurrency } from "@app/graphql/generated"
import { MoneyAmount, WalletOrDisplayCurrency } from "@app/types/amounts"
import { WalletDescriptor } from "@app/types/wallets"
import { CreatePaymentRequestDetailsParams } from "./payment-requests"
import {
  ConvertPaymentAmount,
  PaymentRequestDetails,
  PaymentRequest,
  PaymentRequestType,
} from "./payment-requests/index.types"

export type UsePaymentRequestParams<W extends WalletCurrency> = {
  initialCreatePaymentRequestDetailsParams?: CreatePaymentRequestDetailsParams<W>
}

export const PaymentRequestState = {
  Idle: "Idle",
  Loading: "Loading",
  Created: "Created",
  Error: "Error",
  Paid: "Paid",
  Expired: "Expired",
} as const

export const ErrorType = {
  Generic: "Generic",
}

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType]

export type UsePaymentRequestState<W extends WalletCurrency> =
  | {
      state: typeof PaymentRequestState.Idle
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W> | undefined
      paymentRequestDetails: PaymentRequestDetails<W> | undefined
      paymentRequest?: undefined
      error?: undefined
    }
  | {
      state: typeof PaymentRequestState.Loading
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W>
      paymentRequestDetails: PaymentRequestDetails<W>
      paymentRequest?: undefined
      error?: undefined
    }
  | {
      state: typeof PaymentRequestState.Created
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W>
      paymentRequestDetails: PaymentRequestDetails<W>
      paymentRequest: PaymentRequest
      error?: undefined
    }
  | {
      state: typeof PaymentRequestState.Error
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W>
      paymentRequestDetails: PaymentRequestDetails<W>
      paymentRequest?: undefined
      error: ErrorType
    }
  | {
      state: typeof PaymentRequestState.Paid
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W>
      paymentRequestDetails: PaymentRequestDetails<W>
      paymentRequest: PaymentRequest
    }
  | {
      state: typeof PaymentRequestState.Expired
      createPaymentRequestDetailsParams: CreatePaymentRequestDetailsParams<W>
      paymentRequestDetails: PaymentRequestDetails<W>
      paymentRequest: PaymentRequest
    }

export type PaymentRequestState =
  (typeof PaymentRequestState)[keyof typeof PaymentRequestState]

export type UsePaymentRequestResult = UsePaymentRequestState<WalletCurrency> & {
  setCreatePaymentRequestDetailsParams: (
    params: CreatePaymentRequestDetailsParams<WalletCurrency>,
    generatePaymentRequestAfter?: boolean,
  ) => void
  checkExpiredAndGetRemainingSeconds:
    | ((currentTime: Date) => number | undefined)
    | undefined
} & UsePaymentRequestSetterFns

type UsePaymentRequestSetterFns =
  | {
      setAmount: (
        amount: MoneyAmount<WalletOrDisplayCurrency>,
        generatePaymentRequestAfter?: boolean,
      ) => void
      generatePaymentRequest: () => Promise<void>
      setMemo: (memo: string, generatePaymentRequestAfter?: boolean) => void
      setReceivingWalletDescriptor: (
        receivingWalletDescriptor: WalletDescriptor<WalletCurrency>,
        generatePaymentRequestAfter?: boolean,
      ) => void
      setPaymentRequestType: (
        paymentRequestType: PaymentRequestType,
        generatePaymentRequestAfter?: boolean,
      ) => void
      setConvertPaymentAmount: (
        convertPaymentAmount: ConvertPaymentAmount,
        generatePaymentRequestAfter?: boolean,
      ) => void
    }
  | {
      generatePaymentRequest?: undefined
      setAmount?: undefined
      setMemo?: undefined
      setReceivingWalletDescriptor?: undefined
      setPaymentRequestType?: undefined
      setConvertPaymentAmount?: undefined
    }
