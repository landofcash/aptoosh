import React, {useEffect, useState} from "react";
import CopyableField from "./CopyableField";
import {resolveName} from "@/lib/cryptoNameHelpers.ts";

interface AddressWithNameProps {
  label?: string;
  value: string;
  length?: number;
  mdLength?: number;
  small?: boolean;
}

const AddressWithName: React.FC<AddressWithNameProps> = ({label, value, length = 8, mdLength = 17, small = false}) => {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    resolveName(value).then(setName);
  }, [value]);

  return (
    <CopyableField label={label} value={value} displayValue={name ?? undefined} length={length} mdLength={mdLength}
                   small={small}/>
  );
};

export default AddressWithName;
