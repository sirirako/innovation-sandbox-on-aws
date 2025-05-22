// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const formatCurrency = (num: number): string => {
  if (num === undefined) {
    return "";
  }

  const formattedNum = num.toFixed(2);
  const [whole, decimal] = formattedNum.split(".");

  if (decimal === "00") {
    return `$${whole}`;
  } else {
    return `$${whole}.${decimal}`;
  }
};
