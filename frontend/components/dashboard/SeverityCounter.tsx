"use client";

import CountUp from "react-countup";

type Props = {
  count: number;
};

export default function SeverityCounter({ count }: Props) {
  return <CountUp end={count} duration={2} />;
}