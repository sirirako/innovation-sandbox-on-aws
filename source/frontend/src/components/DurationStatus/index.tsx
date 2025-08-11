// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Popover, StatusIndicator } from "@cloudscape-design/components";
import moment from "moment";

interface DurationStatusProps {
  date?: Date | string;
  durationInHours?: number;
  expired?: boolean;
}

export const DurationStatus = ({
  date,
  durationInHours,
  expired,
}: DurationStatusProps) => {
  if (date) {
    const isLessThanOneHourFromNow =
      moment(date).diff(moment(), "hours") < 1 && !expired;

    return (
      <Popover
        position="top"
        size="large"
        dismissButton={false}
        content={`This lease ${moment(date).isBefore(moment()) ? "expired" : "will expire"} on ${moment(date).format("lll")}`}
      >
        {isLessThanOneHourFromNow ? "expiring soon" : moment(date).fromNow()}
      </Popover>
    );
  }

  if (durationInHours) {
    return (
      <Box>
        <Box>{moment.duration(durationInHours, "hours").humanize()}</Box>
        <Box>
          <small data-muted>after approval</small>
        </Box>
      </Box>
    );
  }

  return <StatusIndicator type="warning">{"No expiry"}</StatusIndicator>;
};
