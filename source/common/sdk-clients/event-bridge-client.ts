// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Tracer } from "@aws-lambda-powertools/tracer";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

export type IsbEventBridgeProps = {
  Source: string;
  EventBusName: string;
};

export abstract class IsbEvent {
  abstract readonly Detail: { [key: string]: any };
  abstract readonly DetailType: string;
}

export class IsbEventBridgeClient extends EventBridgeClient {
  commonIsbEventProps: IsbEventBridgeProps;

  constructor(
    isbProps: IsbEventBridgeProps,
    ...args: ConstructorParameters<typeof EventBridgeClient>
  ) {
    super(...args);
    this.commonIsbEventProps = isbProps;
  }

  public async sendIsbEvents(tracer: Tracer, ...events: IsbEvent[]) {
    for (const event of events) {
      await this.sendIsbEvent(tracer, event);
    }
  }

  public async sendIsbEvent(tracer: Tracer, event: IsbEvent) {
    const subsegment = tracer.getSegment()?.addNewSubsegment(event.DetailType);

    try {
      const traceRootId = tracer.getRootXrayTraceId();
      const parentId = subsegment?.id;
      const TraceHeader = `Root=${traceRootId};Parent=${parentId};Sampled=1`;

      await this.send(
        new PutEventsCommand({
          Entries: [
            {
              DetailType: event.DetailType,
              Detail: JSON.stringify(event.Detail),
              ...this.commonIsbEventProps,
              TraceHeader,
            },
          ],
        }),
      );
    } finally {
      subsegment?.close();
    }
  }
}
