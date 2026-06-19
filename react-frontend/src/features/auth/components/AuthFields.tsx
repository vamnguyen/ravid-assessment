import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthFieldsProps = {
  idPrefix: string
  email: string
  password: string
  disabled: boolean
  passwordAutoComplete: "current-password" | "new-password"
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
}

export function AuthFields({
  idPrefix,
  email,
  password,
  disabled,
  passwordAutoComplete,
  onEmailChange,
  onPasswordChange,
}: AuthFieldsProps) {
  const emailId = `${idPrefix}-email`
  const passwordId = `${idPrefix}-password`

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={emailId}>Email</FieldLabel>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          disabled={disabled}
          autoComplete="email"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
        <Input
          id={passwordId}
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          disabled={disabled}
          autoComplete={passwordAutoComplete}
        />
        <FieldDescription>Minimum 8 characters for registration.</FieldDescription>
      </Field>
    </FieldGroup>
  )
}
