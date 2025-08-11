// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { HelpPanel } from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";

import { MarkdownLink } from "@amzn/innovation-sandbox-frontend/components/Markdown/MarkdownLink";

interface MarkdownProps {
  file: string;
}

const markdownComponents: Components = {
  a: (props: any) => <MarkdownLink {...props} />,
};

export const Markdown = ({ file }: MarkdownProps) => {
  const [markdown, setMarkdown] = useState<any>();

  const init = async () => {
    const md = await import(`../../markdown/${file}.md`);
    setMarkdown(md);
  };

  useEffect(() => {
    init();
  }, [file]);

  if (markdown) {
    return (
      <HelpPanel header={markdown.attributes.title}>
        <ReactMarkdown components={markdownComponents}>
          {markdown.markdown}
        </ReactMarkdown>
      </HelpPanel>
    );
  }
};
