import { useState } from 'react';
import Router from 'next/router';

const Form = ({
  formData,
  setFormData,
  onFormSubmit,
  errors,
  formName,
  fields,
}) => {
  // Updates the corresponding field in formData whenever an input changes.
  // The input's "name" attribute determines which property is updated.
  const onFormValueChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fieldNames = fields.map((field) => field.name);

  const onBlur = (e) => {
    const { name, value } = e.target;
    const amount = parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(amount) ? 0 : amount.toFixed(2),
    }));
  };

  // Displays any errors that match the supplied filter.
  // This allows the same function to render field-specific
  // errors as well as general form errors.
  function renderErrors(filter) {
    return (
      <div>
        {errors.map((e) =>
          filter(e) ? (
            <div className="text-danger" key={e.message}>
              {e.message}
            </div>
          ) : null,
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onFormSubmit}>
      <h1>{formName}</h1>
      {fields.map((data) => {
        return (
          <div key={data.name + data.label} className="form-group mt-2">
            <label>{data.label}</label>
            <input
              className="form-control mb-2"
              type={data.type}
              name={data.name}
              value={formData[data.name]}
              onChange={onFormValueChange}
              onBlur={data.onBlur ? onBlur : null}
            ></input>
            {renderErrors((e) => e.field === data.name)}
          </div>
        );
      })}
      <button className="btn btn-primary mt-2">Submit</button>
      {renderErrors((e) => !fieldNames.includes(e.field))}
    </form>
  );
};

export default Form;
