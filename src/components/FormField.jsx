import React from "react";
import {
  TextField,
  Autocomplete,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useField } from "formik";
import { motion } from "framer-motion";

/**
 * Reusable form field component that wraps various MUI input types
 */
const FormField = ({ type, name, label, options = [], ...props }) => {
  const [field, meta, helpers] = useField(name);
  const isError = meta.touched && !!meta.error;
  const helperText = isError ? meta.error : "";

  // Animation variants for field
  const fieldVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Render different input types based on the type prop
  switch (type) {
    case "date":
      return (
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", marginBottom: "16px" }}
        >
          <DatePicker
            label={label}
            value={field.value || null}
            onChange={(value) => helpers.setValue(value)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: isError,
                helperText: helperText,
                onBlur: field.onBlur,
                name: field.name,
              },
            }}
            {...props}
          />
        </motion.div>
      );

    case "autocomplete":
      return (
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", marginBottom: "16px", minWidth: "160px" }}
        >
          <Autocomplete
            options={options}
            value={field.value || null}
            onChange={(_, value) => helpers.setValue(value)}
            onBlur={field.onBlur}
            renderInput={(params) => (
              <TextField
                {...params}
                name={field.name}
                label={label}
                error={isError}
                helperText={helperText}
                fullWidth
              />
            )}
            {...props}
          />
        </motion.div>
      );

    case "select":
      return (
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", marginBottom: "16px", minWidth: "160px" }}
        >
          <FormControl fullWidth error={isError}>
            <InputLabel id={`${name}-label`}>{label}</InputLabel>
            <Select
              labelId={`${name}-label`}
              id={name}
              {...field}
              label={label}
              {...props}
            >
              {options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {isError && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        </motion.div>
      );

    case "textarea":
      return (
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", marginBottom: "16px", minWidth: "160px" }}
        >
          <TextField
            {...field}
            label={label}
            multiline
            rows={4}
            error={isError}
            helperText={helperText}
            fullWidth
            {...props}
          />
        </motion.div>
      );

    default:
      return (
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", marginBottom: "16px" }}
        >
          <TextField
            {...field}
            type={type}
            label={label}
            error={isError}
            helperText={helperText}
            fullWidth
            {...props}
          />
        </motion.div>
      );
  }
};

export default FormField;
