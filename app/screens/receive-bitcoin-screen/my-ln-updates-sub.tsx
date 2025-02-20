import { gql, useApolloClient } from "@apollo/client"
import { MainAuthedDocument, useMyLnUpdatesSubscription } from "@app/graphql/generated"
import { LnUpdateHashPaidProvider } from "@app/graphql/ln-update-context"
import React, { PropsWithChildren, useState } from "react"

gql`
  subscription myLnUpdates {
    myUpdates {
      errors {
        message
      }
      update {
        ... on LnUpdate {
          paymentHash
          status
        }
      }
    }
  }
`

export const MyLnUpdateSub = ({ children }: PropsWithChildren) => {
  const client = useApolloClient()

  const { data: dataSub } = useMyLnUpdatesSubscription()
  const [lastHash, setLastHash] = useState<string>("")

  React.useEffect(() => {
    if (dataSub?.myUpdates?.update?.__typename === "LnUpdate") {
      const update = dataSub.myUpdates.update

      if (update.status === "PAID") {
        client.refetchQueries({ include: [MainAuthedDocument] })
        setLastHash(update.paymentHash)
      }
    }
  }, [dataSub, client])

  return <LnUpdateHashPaidProvider value={lastHash}>{children}</LnUpdateHashPaidProvider>
}
